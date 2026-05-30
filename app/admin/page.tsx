"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiLogOut,
  FiPackage,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
} from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import {
  getProductDisplayImageUrl,
  getProductImageRows,
  getProductImageUrls,
  getProductStock,
  PRODUCT_IMAGE_BUCKET,
  type Product,
} from "@/lib/productImages";
import {
  ALL_CATEGORIES_LABEL,
  getProductCategoryLabelForProduct,
  PRODUCT_CATEGORIES,
  productMatchesCategory,
  UNCATEGORIZED_CATEGORY_LABEL,
} from "@/lib/productCategories";
import BrandLogo from "@/app/components/BrandLogo";
import Product360Viewer from "@/app/components/Product360Viewer";

const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ADMIN_IDLE_CHECK_MS = 60 * 1000;
const ADMIN_LAST_ACTIVITY_KEY = "marky-admin-last-activity";

const ADMIN_ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

const ROTATION_ROW_LABELS = [
  "Low angle row",
  "Straight angle row",
  "High angle row",
] as const;

const ADMIN_CATEGORY_FILTERS = [
  {
    label: ALL_CATEGORIES_LABEL,
    value: "all",
  },
  ...PRODUCT_CATEGORIES,
];

const MAIN_IMAGE_COMPRESSION = {
  maxDimension: 1400,
  quality: 0.86,
};

const ROTATION_IMAGE_COMPRESSION = {
  maxDimension: 900,
  quality: 0.78,
};

type ImageCompressionOptions = {
  maxDimension: number;
  quality: number;
};

type LoadedImageSource = HTMLImageElement | ImageBitmap;

function createEmptyRotationImageRows() {
  return ROTATION_ROW_LABELS.map(() => [] as File[]);
}

function getCompressedFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".webp";
}

function getImageSourceSize(source: LoadedImageSource) {
  if (source instanceof HTMLImageElement) {
    return {
      height: source.naturalHeight,
      width: source.naturalWidth,
    };
  }

  return {
    height: Number(source.height),
    width: Number(source.width),
  };
}

function loadImageSource(file: File): Promise<LoadedImageSource> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not read image."));
    };
    image.src = imageUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function compressImageFile(
  file: File,
  options: ImageCompressionOptions
) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const imageSource = await loadImageSource(file);
  const { height, width } = getImageSourceSize(imageSource);

  if (!height || !width) return file;

  const scale = Math.min(1, options.maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return file;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

  if (imageSource instanceof ImageBitmap) {
    imageSource.close();
  }

  const blob = await canvasToBlob(canvas, "image/webp", options.quality);

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], getCompressedFileName(file.name), {
    lastModified: Date.now(),
    type: "image/webp",
  });
}

function sortFilesByName(files: File[]) {
  return [...files].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function countRotationRowFiles(rows: File[][]) {
  return rows.reduce((count, row) => count + row.length, 0);
}

function countRotationRows(rows?: string[][] | null) {
  return (rows || []).filter((row) => row.length > 0).length;
}

function getProductRotationPaths(product: Product) {
  return Array.from(
    new Set([
      ...(product.rotation_image_urls || []),
      ...(product.rotation_image_rows || []).flat(),
    ])
  );
}

type Order = {
  id: string;
  created_at: string;
  product_name: string;
  amount: number;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  payment_status: string;
  transaction_id: string;
  order_status: string;
  assigned_vendor: string | null;
};

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "NGN 0";

  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function getProductSaveErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error ? error.message : "";

  if (
    message.includes("stock_quantity") &&
    message.includes("schema cache")
  ) {
    return "Product stock is not set up in Supabase yet. Run supabase/product-stock.sql in the Supabase SQL editor, then try again.";
  }

  if (message.includes("category") && message.includes("schema cache")) {
    return "Product categories are not set up in Supabase yet. Run supabase/product-categories.sql in the Supabase SQL editor, then try again.";
  }

  if (
    (message.includes("is_giftable") ||
      message.includes("is_event_pick")) &&
    message.includes("schema cache")
  ) {
    return "Buyer-intent picks are not set up in Supabase yet. Run supabase/product-buyer-intents.sql in the Supabase SQL editor, then try again.";
  }

  return message || fallback;
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    category: PRODUCT_CATEGORIES[0].label,
    isEventPick: false,
    isGiftable: false,
    name: "",
    price: "",
    stockQuantity: "",
    description: "",
  });

  const [image, setImage] = useState<File | null>(null);

  const [rotationImageRows, setRotationImageRows] = useState<File[][]>(
    createEmptyRotationImageRows
  );

  const [products, setProducts] = useState<Product[]>([]);

  const [adminCategoryFilter, setAdminCategoryFilter] = useState(
    ALL_CATEGORIES_LABEL
  );

  const [orders, setOrders] = useState<Order[]>([]);

  const [ordersError, setOrdersError] = useState("");

  const [saving, setSaving] = useState(false);

  const [updatingProductId, setUpdatingProductId] = useState<Product["id"] | null>(
    null
  );

  const [updatingStockProductId, setUpdatingStockProductId] = useState<
    Product["id"] | null
  >(null);

  const [updatingCategoryProductId, setUpdatingCategoryProductId] = useState<
    Product["id"] | null
  >(null);

  const [updatingBuyerEditProductId, setUpdatingBuyerEditProductId] = useState<
    Product["id"] | null
  >(null);

  const [productRotationRows, setProductRotationRows] = useState<
    Record<string, File[][]>
  >({});

  const [productStockForms, setProductStockForms] = useState<
    Record<string, string>
  >({});

  const [productCategoryForms, setProductCategoryForms] = useState<
    Record<string, string>
  >({});

  const [productBuyerEditForms, setProductBuyerEditForms] = useState<
    Record<string, { isEventPick: boolean; isGiftable: boolean }>
  >({});

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // -----------------------------------
  // FETCH PRODUCTS
  // -----------------------------------
  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setProducts(data || []);
    }
  }, []);

  const getAdminAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      router.push("/login");
      throw new Error("Please log in again to manage orders.");
    }

    return token;
  }, [router]);

  // -----------------------------------
  // FETCH ORDERS
  // -----------------------------------
  const fetchOrders = useCallback(async () => {
    setOrdersError("");

    try {
      const token = await getAdminAccessToken();
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json().catch(() => null)) as {
        orders?: Order[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Could not load orders.");
      }

      setOrders(result?.orders || []);
    } catch (error) {
      setOrders([]);
      setOrdersError(
        error instanceof Error ? error.message : "Could not load orders."
      );
    }
  }, [getAdminAccessToken]);

  // -----------------------------------
  // AUTH CHECK
  // -----------------------------------
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      await fetchProducts();
      await fetchOrders();

      setLoading(false);
    };

    checkUser();
  }, [fetchProducts, fetchOrders, router]);

  // -----------------------------------
  // INACTIVITY LOGOUT
  // -----------------------------------
  useEffect(() => {
    let signingOut = false;

    const getLastActivity = () => {
      const value = window.localStorage.getItem(
        ADMIN_LAST_ACTIVITY_KEY
      );

      const timestamp = value ? Number(value) : null;

      return timestamp && Number.isFinite(timestamp)
        ? timestamp
        : null;
    };

    const markActivity = () => {
      if (!signingOut) {
        window.localStorage.setItem(
          ADMIN_LAST_ACTIVITY_KEY,
          String(Date.now())
        );
      }
    };

    const signOutForInactivity = async () => {
      if (signingOut) return;

      signingOut = true;

      window.localStorage.removeItem(
        ADMIN_LAST_ACTIVITY_KEY
      );

      await supabase.auth.signOut();

      router.replace("/login");
    };

    const checkIdle = () => {
      const lastActivity = getLastActivity();

      if (!lastActivity) {
        markActivity();
        return false;
      }

      if (
        Date.now() - lastActivity >=
        ADMIN_IDLE_TIMEOUT_MS
      ) {
        void signOutForInactivity();
        return true;
      }

      return false;
    };

    const handleActivity = () => {
      if (!checkIdle()) {
        markActivity();
      }
    };

    const intervalId = window.setInterval(
      checkIdle,
      ADMIN_IDLE_CHECK_MS
    );

    checkIdle();

    ADMIN_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity
      );
    });

    window.addEventListener("focus", checkIdle);

    document.addEventListener(
      "visibilitychange",
      checkIdle
    );

    return () => {
      window.clearInterval(intervalId);

      ADMIN_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleActivity
        );
      });

      window.removeEventListener("focus", checkIdle);

      document.removeEventListener(
        "visibilitychange",
        checkIdle
      );
    };
  }, [router]);

  // -----------------------------------
  // HANDLE INPUT
  // -----------------------------------
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // -----------------------------------
  // LOGOUT
  // -----------------------------------
  const handleLogout = async () => {
    window.localStorage.removeItem(
      ADMIN_LAST_ACTIVITY_KEY
    );

    await supabase.auth.signOut();

    router.replace("/login");
  };

  // -----------------------------------
  // UPLOAD IMAGE
  // -----------------------------------
  const uploadImageFile = async (
    file: File,
    compressionOptions: ImageCompressionOptions
  ) => {
    const { data: sessionData } =
      await supabase.auth.getSession();

    if (!sessionData.session) {
      await supabase.auth.signOut();

      throw new Error(
        "Please log in again before uploading."
      );
    }

    const formData = new FormData();
    const uploadFile = await compressImageFile(file, compressionOptions);

    formData.append("image", uploadFile);

    const response = await fetch(
      "/api/admin/upload-product-image",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: formData,
      }
    );

    const result = (await response.json()) as {
      path?: string;
      error?: string;
    };

    if (!response.ok || !result.path) {
      throw new Error(
        result.error || "Image upload failed."
      );
    }

    return result.path;
  };

  const uploadImage = async () => {
    if (!image) return null;

    return uploadImageFile(image, MAIN_IMAGE_COMPRESSION);
  };

  const uploadRotationImageRows = async (rows: File[][]) => {
    const uploadedRows: string[][] = [];

    for (const row of rows) {
      const uploadedRow: string[] = [];

      for (const rotationImage of row) {
        uploadedRow.push(
          await uploadImageFile(rotationImage, ROTATION_IMAGE_COMPRESSION)
        );
      }

      if (uploadedRow.length > 0) {
        uploadedRows.push(uploadedRow);
      }
    }

    return uploadedRows;
  };

  const updateNewProductRotationRow = (rowIndex: number, files: File[]) => {
    setRotationImageRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex ? sortFilesByName(files) : row
      )
    );
  };

  const updateExistingProductRotationRow = (
    productId: Product["id"],
    rowIndex: number,
    files: File[]
  ) => {
    const productKey = String(productId);

    setProductRotationRows((currentRows) => {
      const selectedRows =
        currentRows[productKey]?.map((row) => [...row]) ||
        createEmptyRotationImageRows();

      selectedRows[rowIndex] = sortFilesByName(files);

      return {
        ...currentRows,
        [productKey]: selectedRows,
      };
    });
  };

  const updateProductStock = async (product: Product) => {
    if (updatingStockProductId) return;

    const productKey = String(product.id);
    const stockQuantity = Number(
      productStockForms[productKey] ?? getProductStock(product)
    );

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      alert("Please enter a whole number for items in stock.");
      return;
    }

    setUpdatingStockProductId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock_quantity: stockQuantity,
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      setProductStockForms((currentForms) => {
        const nextForms = { ...currentForms };
        delete nextForms[productKey];
        return nextForms;
      });

      await fetchProducts();
    } catch (error) {
      alert(getProductSaveErrorMessage(error, "Could not update stock."));
    } finally {
      setUpdatingStockProductId(null);
    }
  };

  const updateProductCategory = async (product: Product) => {
    if (updatingCategoryProductId) return;

    const productKey = String(product.id);
    const category =
      productCategoryForms[productKey] ||
      getProductCategoryLabelForProduct(product);

    if (!PRODUCT_CATEGORIES.some((option) => option.label === category)) {
      alert("Please choose a valid product category.");
      return;
    }

    setUpdatingCategoryProductId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          category,
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      setProductCategoryForms((currentForms) => {
        const nextForms = { ...currentForms };
        delete nextForms[productKey];
        return nextForms;
      });

      await fetchProducts();
    } catch (error) {
      alert(
        getProductSaveErrorMessage(
          error,
          "Could not update product category."
        )
      );
    } finally {
      setUpdatingCategoryProductId(null);
    }
  };

  const updateProductBuyerEdits = async (product: Product) => {
    if (updatingBuyerEditProductId) return;

    const productKey = String(product.id);
    const buyerEditForm = productBuyerEditForms[productKey] || {
      isEventPick: Boolean(product.is_event_pick),
      isGiftable: Boolean(product.is_giftable),
    };

    setUpdatingBuyerEditProductId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_event_pick: buyerEditForm.isEventPick,
          is_giftable: buyerEditForm.isGiftable,
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      setProductBuyerEditForms((currentForms) => {
        const nextForms = { ...currentForms };
        delete nextForms[productKey];
        return nextForms;
      });

      await fetchProducts();
    } catch (error) {
      alert(
        getProductSaveErrorMessage(
          error,
          "Could not update buyer-intent picks."
        )
      );
    } finally {
      setUpdatingBuyerEditProductId(null);
    }
  };

  // -----------------------------------
  // ADD PRODUCT
  // -----------------------------------
  const handleSubmit = async () => {
    if (saving) return;

    if (!form.name.trim() || !form.price.trim() || !form.stockQuantity.trim()) {
      alert("Please enter product name, price, and stock quantity.");
      return;
    }

    if (!PRODUCT_CATEGORIES.some((option) => option.label === form.category)) {
      alert("Please choose a product category.");
      return;
    }

    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);

    if (!Number.isFinite(price) || price <= 0) {
      alert("Please enter a valid product price.");
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      alert("Please enter a whole number for items in stock.");
      return;
    }

    setSaving(true);

    let imagePath: string | null = null;
    let rotationImageRowsPaths: string[][] = [];

    try {
      imagePath = await uploadImage();
      rotationImageRowsPaths = await uploadRotationImageRows(rotationImageRows);

      const { error } = await supabase
        .from("products")
        .insert([
          {
            name: form.name.trim(),
            category: form.category,
            is_event_pick: form.isEventPick,
            is_giftable: form.isGiftable,
            price,
            stock_quantity: stockQuantity,
            description: form.description.trim(),
            image_url: imagePath,
            rotation_image_urls: rotationImageRowsPaths.flat(),
            rotation_image_rows: rotationImageRowsPaths,
          },
        ]);

      if (error) {
        throw new Error(error.message);
      }

      alert("Product added!");

      setForm({
        category: PRODUCT_CATEGORIES[0].label,
        isEventPick: false,
        isGiftable: false,
        name: "",
        price: "",
        stockQuantity: "",
        description: "",
      });

      setImage(null);
      setRotationImageRows(createEmptyRotationImageRows());

      fetchProducts();
    } catch (error) {
      const uploadedPaths = [imagePath, ...rotationImageRowsPaths.flat()].filter(
        (path): path is string => Boolean(path)
      );

      if (uploadedPaths.length) {
        await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .remove(uploadedPaths);
      }

      alert(
        getProductSaveErrorMessage(error, "Could not add product.")
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------
  // DELETE PRODUCT
  // -----------------------------------
  const deleteProduct = async (
    product: Product
  ) => {
    const confirmDelete = confirm(
      "Delete this product?"
    );

    if (!confirmDelete) return;

    const productImagePaths = [
      product.image_url,
      ...getProductRotationPaths(product),
    ].filter((path): path is string => Boolean(path));

    if (productImagePaths.length) {
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(productImagePaths);
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProducts();
  };

  // -----------------------------------
  // UPDATE PRODUCT 360 PHOTOS
  // -----------------------------------
  const updateProductRotationImages = async (
    product: Product,
    rows: File[][]
  ) => {
    if (!countRotationRowFiles(rows) || updatingProductId) return;

    setUpdatingProductId(product.id);

    let newImageRows: string[][] = [];

    try {
      newImageRows = await uploadRotationImageRows(rows);

      const { error } = await supabase
        .from("products")
        .update({
          rotation_image_urls: newImageRows.flat(),
          rotation_image_rows: newImageRows,
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      const previousRotationPaths = getProductRotationPaths(product);

      if (previousRotationPaths.length) {
        await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .remove(previousRotationPaths);
      }

      setProductRotationRows((currentRows) => {
        const nextRows = { ...currentRows };
        delete nextRows[String(product.id)];
        return nextRows;
      });

      await fetchProducts();
    } catch (error) {
      if (newImageRows.flat().length) {
        await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .remove(newImageRows.flat());
      }

      alert(
        error instanceof Error
          ? error.message
          : "Could not update 360 photos."
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  // -----------------------------------
  // UPDATE ORDER STATUS
  // -----------------------------------
  const updateOrderStatus = async (
    id: string,
    status: string
  ) => {
    setUpdatingOrderId(id);

    try {
      const token = await getAdminAccessToken();
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          order_status: status,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        alert(result?.error || "Could not update order.");
        return;
      }

      await fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // -----------------------------------
  // ASSIGN VENDOR
  // -----------------------------------
  const assignVendor = async (
    id: string,
    vendor: string
  ) => {
    try {
      const token = await getAdminAccessToken();
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          assigned_vendor: vendor,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        alert(result?.error || "Could not assign fulfillment.");
        return;
      }

      await fetchOrders();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Could not assign fulfillment."
      );
    }
  };

  // -----------------------------------
  // DELETE ORDER
  // -----------------------------------
  const deleteOrder = async (order: Order) => {
    const confirmDelete = confirm(
      `Delete order for ${order.customer_name || order.product_name}?`
    );

    if (!confirmDelete || deletingOrderId) return;

    setDeletingOrderId(order.id);

    try {
      const token = await getAdminAccessToken();
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: order.id,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        alert(result?.error || "Could not delete order.");
        return;
      }

      setExpandedOrderId((currentOrderId) =>
        currentOrderId === order.id ? null : currentOrderId
      );

      await fetchOrders();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not delete order.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const deliveredOrderCount = orders.filter(
    (order) => order.order_status === "delivered"
  ).length;
  const processingOrderCount = orders.length - deliveredOrderCount;
  const totalOrderValue = orders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );
  const selectedAdminCategory = ADMIN_CATEGORY_FILTERS.find(
    (filter) => filter.label === adminCategoryFilter
  );
  const visibleAdminProducts =
    !selectedAdminCategory ||
    selectedAdminCategory.label === ALL_CATEGORIES_LABEL
      ? products
      : products.filter((product) =>
          productMatchesCategory(product, selectedAdminCategory.label)
        );

  // -----------------------------------
  // LOADING
  // -----------------------------------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf7f2] text-[#64564c]">
        Loading...
      </div>
    );
  }

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <main className="min-h-screen bg-[#fbf7f2] p-5 text-[#1e1b18] sm:p-8">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[#e8ded4] pb-6 md:flex-row md:items-center">

          <BrandLogo compact />

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
          >
            <FiLogOut aria-hidden="true" />
            Logout
          </button>

        </div>

        {/* ADD PRODUCT */}
        <div className="rounded-md border border-[#e8ded4] bg-white p-6 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">

          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#b26a34]">
            <FiPackage aria-hidden="true" />
            Inventory
          </p>

          <h2 className="mt-2 text-3xl font-black text-[#1e1b18]">
            Add fashion item
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-4">

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-md border border-[#d7c7b7] bg-[#fbf7f2] p-3 text-[#1e1b18] outline-none transition focus:border-accent"
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.label}>
                {category.label}
              </option>
            ))}
          </select>

          <input
            name="name"
            placeholder="Item name"
            value={form.name}
            onChange={handleChange}
              className="w-full rounded-md border border-[#d7c7b7] bg-[#fbf7f2] p-3 text-[#1e1b18] outline-none transition placeholder:text-[#8b6b4d] focus:border-accent"
          />

          <input
            name="price"
            type="number"
            min="0"
            step="1"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
              className="w-full rounded-md border border-[#d7c7b7] bg-[#fbf7f2] p-3 text-[#1e1b18] outline-none transition placeholder:text-[#8b6b4d] focus:border-accent"
          />

          <input
            name="stockQuantity"
            type="number"
            min="0"
            step="1"
            placeholder="Items in stock"
            value={form.stockQuantity}
            onChange={handleChange}
              className="w-full rounded-md border border-[#d7c7b7] bg-[#fbf7f2] p-3 text-[#1e1b18] outline-none transition placeholder:text-[#8b6b4d] focus:border-accent"
          />

          </div>

          <input
            name="description"
            placeholder="Short product description"
            value={form.description}
            onChange={handleChange}
            className="mt-4 w-full rounded-md border border-[#d7c7b7] bg-[#fbf7f2] p-3 text-[#1e1b18] outline-none transition placeholder:text-[#8b6b4d] focus:border-accent"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 text-sm font-semibold text-[#64564c]">
              <input
                type="checkbox"
                checked={form.isGiftable}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    isGiftable: event.target.checked,
                  }))
                }
                className="size-5 accent-[#1e1b18]"
              />
              Giftable picks
            </label>

            <label className="flex items-center gap-3 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 text-sm font-semibold text-[#64564c]">
              <input
                type="checkbox"
                checked={form.isEventPick}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    isEventPick: event.target.checked,
                  }))
                }
                className="size-5 accent-[#1e1b18]"
              />
              Event pieces
            </label>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setImage(e.target.files?.[0] || null)
            }
            className="mt-4 w-full rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 text-sm text-[#64564c] file:mr-4 file:rounded-md file:border-0 file:bg-[#1e1b18] file:px-4 file:py-2 file:font-bold file:text-white"
          />

          <p className="mb-2 mt-5 text-sm font-black uppercase tracking-[0.14em] text-[#b26a34]">
            Multi-row 360 photos
          </p>

          <div className="mb-2 grid gap-3 md:grid-cols-3">
            {ROTATION_ROW_LABELS.map((label, rowIndex) => (
              <label
                key={label}
                className="rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 text-sm"
              >
                <span className="mb-2 block font-semibold text-[#64564c]">
                  {label}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    updateNewProductRotationRow(
                      rowIndex,
                      Array.from(e.target.files || [])
                    )
                  }
                  className="w-full text-xs text-[#64564c] file:mr-3 file:rounded-md file:border-0 file:bg-[#1e1b18] file:px-3 file:py-2 file:font-bold file:text-white"
                />
                {rotationImageRows[rowIndex].length > 0 && (
                  <span className="mt-2 block text-xs text-[#8b6b4d]">
                    {rotationImageRows[rowIndex].length} photos selected
                  </span>
                )}
              </label>
            ))}
          </div>

          {countRotationRowFiles(rotationImageRows) > 0 && (
            <p className="mb-6 text-sm text-[#64564c]">
              {countRotationRowFiles(rotationImageRows)} photos selected across{" "}
              {rotationImageRows.filter((row) => row.length > 0).length} rows
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-md bg-[#1e1b18] py-3 font-black uppercase tracking-[0.14em] text-white transition hover:bg-accent disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Item"}
          </button>

        </div>

        {/* PRODUCTS */}
        <div className="mt-12">

          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-[#1e1b18]">
            <FiShoppingBag className="text-[#b26a34]" aria-hidden="true" />
            Products
          </h2>

          <div className="mb-5 rounded-md border border-[#e8ded4] bg-white p-4 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <p className="text-sm font-semibold text-[#64564c]">
                Showing{" "}
                <span className="font-black text-[#1e1b18]">
                  {visibleAdminProducts.length}
                </span>{" "}
                of{" "}
                <span className="font-black text-[#1e1b18]">
                  {products.length}
                </span>{" "}
                products
              </p>

              <div className="flex gap-2 overflow-x-auto">
                {ADMIN_CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => setAdminCategoryFilter(filter.label)}
                    className={[
                      "shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.13em] transition",
                      adminCategoryFilter === filter.label
                        ? "bg-[#1e1b18] text-white"
                        : "text-[#1e1b18] hover:bg-[#f3ebe2] hover:text-accent",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibleAdminProducts.length === 0 ? (
            <div className="rounded-md border border-[#e8ded4] bg-white p-8 text-center shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
              <h3 className="text-2xl font-black text-[#1e1b18]">
                No products in this category
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64564c]">
                Assign products to {adminCategoryFilter} to mirror the
                storefront menu.
              </p>
            </div>
          ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {visibleAdminProducts.map((p) => {
              const imageUrl = getProductDisplayImageUrl(p);
              const rotationImageUrls = getProductImageUrls(
                p.rotation_image_urls
              );
              const rotationImageRows = getProductImageRows(
                p.rotation_image_rows,
                p.rotation_image_urls
              );
              const selectedRotationRows =
                productRotationRows[String(p.id)] ||
                createEmptyRotationImageRows();
              const selectedRotationFileCount =
                countRotationRowFiles(selectedRotationRows);
              const stockQuantity = getProductStock(p);
              const productStockValue =
                productStockForms[String(p.id)] ?? String(stockQuantity);
              const productCategoryLabel = getProductCategoryLabelForProduct(p);
              const productCategoryValue =
                productCategoryForms[String(p.id)] ||
                (productCategoryLabel === UNCATEGORIZED_CATEGORY_LABEL
                  ? ""
                  : productCategoryLabel);
              const buyerEditValue =
                productBuyerEditForms[String(p.id)] || {
                  isEventPick: Boolean(p.is_event_pick),
                  isGiftable: Boolean(p.is_giftable),
                };

              return (
                <article
                  key={p.id}
                  className="group flex h-full flex-col overflow-hidden rounded-md border border-[#e8ded4] bg-white shadow-[0_14px_32px_rgba(30,27,24,0.08)] transition hover:-translate-y-1 hover:border-[#b88b5a]"
                >

                  <div className="relative bg-[#f7f2ec]">
                    <span className="absolute left-3 top-3 z-10 rounded-md bg-[#1e1b18] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">
                      Admin
                    </span>

                  <Product360Viewer
                    alt={p.name}
                    imageUrl={imageUrl}
                    frameUrls={rotationImageUrls}
                    frameRows={rotationImageRows}
                      className="h-72 rounded-none border-0 bg-[#f7f2ec]"
                  />
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold leading-6 text-[#1e1b18]">
                        {p.name}
                      </h3>
                      <p className="shrink-0 rounded-md bg-[#fff4f9] px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-accent">
                        {productCategoryLabel}
                      </p>
                    </div>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-[#64564c]">
                    {p.description ||
                      "Boutique-ready fashion item for your next restock."}
                  </p>

                  <p className="mt-3 text-xl font-black text-[#1e1b18]">
                    {formatCurrency(p.price)}
                  </p>

                  <p
                    className={[
                      "mt-3 inline-flex rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.14em]",
                      stockQuantity > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-50 text-red-700",
                    ].join(" ")}
                  >
                    {stockQuantity > 0
                      ? `${stockQuantity} in stock`
                      : "Out of stock"}
                  </p>

                    <div className="mt-5 border-t border-[#e8ded4] pt-4">
                  <div className="mb-3 flex flex-col gap-3 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm font-semibold text-[#64564c]">
                      <span className="mb-2 block">Storefront category</span>
                      <select
                        value={productCategoryValue}
                        onChange={(e) =>
                          setProductCategoryForms((currentForms) => ({
                            ...currentForms,
                            [String(p.id)]: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-[#d7c7b7] bg-white p-3 text-[#1e1b18] outline-none transition focus:border-accent"
                      >
                        <option value="" disabled>
                          Choose category
                        </option>
                        {PRODUCT_CATEGORIES.map((category) => (
                          <option key={category.value} value={category.label}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={
                        Boolean(updatingCategoryProductId) ||
                        !productCategoryValue
                      }
                      onClick={() => updateProductCategory(p)}
                      className="rounded-md border border-[#d7c7b7] bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingCategoryProductId === p.id
                        ? "Updating..."
                        : "Update Category"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm font-semibold text-[#64564c]">
                      <span className="mb-2 block">Items in stock</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={productStockValue}
                        onChange={(e) =>
                          setProductStockForms((currentForms) => ({
                            ...currentForms,
                            [String(p.id)]: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-[#d7c7b7] bg-white p-3 text-[#1e1b18] outline-none transition focus:border-accent"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(updatingStockProductId)}
                      onClick={() => updateProductStock(p)}
                      className="rounded-md border border-[#d7c7b7] bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingStockProductId === p.id
                        ? "Updating..."
                        : "Update Stock"}
                    </button>
                  </div>

                  <div className="mt-3 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3">
                    <p className="text-sm font-semibold text-[#64564c]">
                      Buyer-intent shelves
                    </p>
                    <div className="mt-3 grid gap-2">
                      <label className="flex items-center gap-3 text-sm font-semibold text-[#64564c]">
                        <input
                          type="checkbox"
                          checked={buyerEditValue.isGiftable}
                          onChange={(event) =>
                            setProductBuyerEditForms((currentForms) => ({
                              ...currentForms,
                              [String(p.id)]: {
                                ...buyerEditValue,
                                isGiftable: event.target.checked,
                              },
                            }))
                          }
                          className="size-5 accent-[#1e1b18]"
                        />
                        Giftable picks
                      </label>

                      <label className="flex items-center gap-3 text-sm font-semibold text-[#64564c]">
                        <input
                          type="checkbox"
                          checked={buyerEditValue.isEventPick}
                          onChange={(event) =>
                            setProductBuyerEditForms((currentForms) => ({
                              ...currentForms,
                              [String(p.id)]: {
                                ...buyerEditValue,
                                isEventPick: event.target.checked,
                              },
                            }))
                          }
                          className="size-5 accent-[#1e1b18]"
                        />
                        Event pieces
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(updatingBuyerEditProductId)}
                      onClick={() => updateProductBuyerEdits(p)}
                      className="mt-3 rounded-md border border-[#d7c7b7] bg-white px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingBuyerEditProductId === p.id
                        ? "Updating..."
                        : "Update Buyer Edits"}
                    </button>
                  </div>

                  <button
                    onClick={() => deleteProduct(p)}
                        className="mt-3 inline-flex w-fit rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                  >
                    Delete
                  </button>

                  <div className="mt-4 border-t border-[#e8ded4] pt-4">
                    <p className="mb-2 text-sm font-semibold text-[#8b6b4d]">
                      {updatingProductId === p.id
                        ? "Updating 360 photos..."
                            : `${selectedRotationFileCount} selected | ${countRotationRows(
                            p.rotation_image_rows
                          ) || (rotationImageUrls.length ? 1 : 0)} rows`}
                    </p>

                    <div className="grid gap-3 md:grid-cols-3">
                      {ROTATION_ROW_LABELS.map((label, rowIndex) => (
                        <label
                          key={`${p.id}-${label}`}
                          className="rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-3 text-sm"
                        >
                          <span className="mb-2 block font-semibold text-[#64564c]">
                            {label}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={Boolean(updatingProductId)}
                            onChange={(e) =>
                              updateExistingProductRotationRow(
                                p.id,
                                rowIndex,
                                Array.from(e.target.files || [])
                              )
                            }
                            className="w-full text-xs text-[#64564c] disabled:opacity-60 file:mr-3 file:rounded-md file:border-0 file:bg-[#1e1b18] file:px-3 file:py-2 file:font-bold file:text-white"
                          />
                          {selectedRotationRows[rowIndex].length > 0 && (
                            <span className="mt-2 block text-xs text-[#8b6b4d]">
                              {selectedRotationRows[rowIndex].length} selected
                            </span>
                          )}
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={
                        Boolean(updatingProductId) ||
                        selectedRotationFileCount === 0
                      }
                      onClick={() =>
                        updateProductRotationImages(p, selectedRotationRows)
                      }
                      className="mt-3 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Replace 360 photos
                    </button>
                  </div>
                    </div>
                  </div>

                </article>
              );
            })}

          </div>
          )}

        </div>

        {/* ORDERS */}
        <div className="mt-12">

          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-[#1e1b18]">
            <FiTruck className="text-[#b26a34]" aria-hidden="true" />
            Orders
          </h2>

          {ordersError && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {ordersError}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[#e8ded4] bg-white p-4 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
              <p className="flex items-center gap-2 text-sm font-bold text-[#64564c]">
                <FiCreditCard className="text-[#b26a34]" aria-hidden="true" />
                Paid orders
              </p>
              <p className="mt-2 text-3xl font-black text-[#1e1b18]">
                {orders.length}
              </p>
            </div>

            <div className="rounded-md border border-[#e8ded4] bg-white p-4 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
              <p className="flex items-center gap-2 text-sm font-bold text-[#64564c]">
                <FiClock className="text-[#b26a34]" aria-hidden="true" />
                Processing
              </p>
              <p className="mt-2 text-3xl font-black text-[#1e1b18]">
                {processingOrderCount}
              </p>
            </div>

            <div className="rounded-md border border-[#e8ded4] bg-white p-4 shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
              <p className="flex items-center gap-2 text-sm font-bold text-[#64564c]">
                <FiCheckCircle className="text-[#b26a34]" aria-hidden="true" />
                Delivered
              </p>
              <p className="mt-2 text-3xl font-black text-[#1e1b18]">
                {deliveredOrderCount}
              </p>
              <p className="mt-1 text-sm text-[#8b6b4d]">
                {formatCurrency(totalOrderValue)}
              </p>
            </div>
          </div>

          <div className="space-y-4">

            {orders.length === 0 && !ordersError ? (
              <div className="rounded-md border border-[#e8ded4] bg-white p-8 text-center shadow-[0_14px_32px_rgba(30,27,24,0.06)]">
                <h3 className="text-2xl font-black text-[#1e1b18]">
                  No paid orders yet
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-[#64564c]">
                  Successful Flutterwave payments will appear here after the
                  transaction is verified.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-[#e8ded4] bg-white shadow-[0_14px_32px_rgba(30,27,24,0.08)]">
                <div className="border-b border-[#e8ded4] bg-[#fffdfb] px-4 py-4">
                  <h3 className="text-xl font-black text-[#1e1b18]">
                    Order list
                  </h3>
                  <p className="mt-1 text-sm text-[#64564c]">
                    Brief order details are shown here. Open an order to view
                    the full report.
                  </p>
                </div>

                <div className="divide-y divide-[#e8ded4]">
                  {orders.map((order) => {
                    const isDelivered = order.order_status === "delivered";
                    const isExpanded = expandedOrderId === order.id;
                    const isDeleting = deletingOrderId === order.id;
                    const isUpdating = updatingOrderId === order.id;

                    return (
                      <article key={order.id} className="p-4 transition hover:bg-[#fbf7f2]">
                        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_auto] md:items-center">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b26a34]">
                                {formatOrderDate(order.created_at)}
                              </p>
                              <h4 className="mt-2 text-lg font-bold text-[#1e1b18]">
                                {order.product_name}
                              </h4>
                              <p className="mt-1 text-sm text-[#64564c]">
                                {order.customer_name}
                              </p>
                            </div>

                            <div>
                              <p className="font-black text-accent">
                                {formatCurrency(order.amount || 0)}
                              </p>
                              <p className="mt-1 text-sm text-[#64564c]">
                                {order.customer_phone || "No phone provided"}
                              </p>
                            </div>

                            <span
                              className={[
                                "inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-black uppercase tracking-[0.12em]",
                                isDelivered
                                  ? "bg-emerald-300 text-emerald-950"
                                  : "bg-[#1e1b18] text-white",
                              ].join(" ")}
                            >
                              {isDelivered ? (
                                <FiCheckCircle aria-hidden="true" />
                              ) : (
                                <FiClock aria-hidden="true" />
                              )}
                              {isDelivered ? "Delivered" : "Processing"}
                            </span>
                          </div>

                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedOrderId((currentOrderId) =>
                                currentOrderId === order.id ? null : order.id
                              )
                            }
                            className="inline-flex w-fit items-center justify-center gap-2 rounded-md border border-[#d7c7b7] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1e1b18] transition hover:border-accent hover:text-accent"
                          >
                            {isExpanded ? (
                              <FiChevronUp aria-hidden="true" />
                            ) : (
                              <FiChevronDown aria-hidden="true" />
                            )}
                            {isExpanded ? "Hide Details" : "View Details"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-5 rounded-md border border-[#e8ded4] bg-[#fbf7f2] p-4">
                            <div className="flex flex-col justify-between gap-3 border-b border-[#e8ded4] pb-4 sm:flex-row sm:items-start">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b26a34]">
                                  Order report
                                </p>
                                <h4 className="mt-2 text-2xl font-black text-[#1e1b18]">
                                  {order.product_name}
                                </h4>
                              </div>

                              <button
                                type="button"
                                onClick={() => deleteOrder(order)}
                                disabled={isDeleting}
                                className="inline-flex w-fit items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FiTrash2 aria-hidden="true" />
                                {isDeleting ? "Deleting..." : "Delete Order"}
                              </button>
                            </div>

                            <dl className="mt-5 grid gap-x-6 gap-y-4 md:grid-cols-2">
                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Customer
                                </dt>
                                <dd className="mt-1 text-[#1e1b18]">
                                  {order.customer_name}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Amount
                                </dt>
                                <dd className="mt-1 font-black text-accent">
                                  {formatCurrency(order.amount || 0)}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Email
                                </dt>
                                <dd className="mt-1 break-words text-[#64564c]">
                                  {order.customer_email}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Phone
                                </dt>
                                <dd className="mt-1 text-[#64564c]">
                                  {order.customer_phone || "Not provided"}
                                </dd>
                              </div>

                              <div className="md:col-span-2">
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Delivery address
                                </dt>
                                <dd className="mt-1 text-[#64564c]">
                                  {order.delivery_address || "Not provided"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Transaction
                                </dt>
                                <dd className="mt-1 break-all text-[#64564c]">
                                  {order.transaction_id}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Payment
                                </dt>
                                <dd className="mt-1 text-[#64564c]">
                                  {order.payment_status}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4d]">
                                  Fulfillment
                                </dt>
                                <dd className="mt-1 text-[#64564c]">
                                  {order.assigned_vendor || "Not assigned"}
                                </dd>
                              </div>
                            </dl>

                            <div className="mt-6 flex flex-wrap gap-2 border-t border-[#e8ded4] pt-5">
                              <button
                                type="button"
                                onClick={() =>
                                  assignVendor(order.id, "Dispatch Desk A")
                                }
                                disabled={isDeleting}
                                className="rounded-md bg-[#1e1b18] px-4 py-2 font-bold text-white transition hover:bg-accent disabled:opacity-60"
                              >
                                Assign Dispatch A
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  assignVendor(order.id, "Dispatch Desk B")
                                }
                                disabled={isDeleting}
                                className="rounded-md border border-[#d7c7b7] bg-white px-4 py-2 font-bold text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:opacity-60"
                              >
                                Assign Dispatch B
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateOrderStatus(order.id, "processing")
                                }
                                disabled={
                                  isDeleting ||
                                  isUpdating ||
                                  (order.order_status || "processing") ===
                                    "processing"
                                }
                                className="rounded-md border border-[#d7c7b7] px-4 py-2 font-bold text-[#1e1b18] transition hover:border-accent hover:text-accent disabled:opacity-60"
                              >
                                Processing
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateOrderStatus(order.id, "delivered")
                                }
                                disabled={
                                  isDeleting ||
                                  isUpdating ||
                                  order.order_status === "delivered"
                                }
                                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-bold text-white transition hover:bg-[#bf2d73] disabled:opacity-60"
                              >
                                <FiCheckCircle aria-hidden="true" />
                                {order.order_status === "delivered"
                                  ? "Delivered"
                                  : "Mark Delivered"}
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </main>
  );
}
