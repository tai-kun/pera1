import type { RouterRouteDefinition } from "@pera1/react";

import CartPage, { loader as cartLoader } from "./pages/cart/index.js";
import CategoryPage, { loader as categoryLoader } from "./pages/categories/[category].js";
import ConfirmPage, { loader as confirmLoader } from "./pages/checkout/confirm.js";
import CheckoutLayout, { loader as checkoutLoader } from "./pages/checkout/layout.js";
import PaymentPage, { loader as paymentLoader } from "./pages/checkout/payment.js";
import ShippingPage, { loader as shippingLoader } from "./pages/checkout/shipping.js";
import HomePage from "./pages/index.js";
import NotFoundPage from "./pages/not-found.js";
import OrderDetailPage, { loader as orderDetailLoader } from "./pages/orders/[orderId].js";
import ProductDetailPage, { loader as productDetailLoader } from "./pages/products/[productId].js";
import ProductsPage, { loader as productsLoader } from "./pages/products/index.js";
import RootLayout from "./pages/root.js";

export const routes: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    index: true,
    component: HomePage,
  },
  {
    path: "/",
    component: RootLayout,
  },
  {
    path: "/products",
    index: true,
    component: ProductsPage,
    loader: productsLoader,
  },
  {
    path: "/products/:productId",
    component: ProductDetailPage,
    loader: productDetailLoader,
  },
  {
    path: "/categories/:category",
    component: CategoryPage,
    loader: categoryLoader,
  },
  {
    path: "/cart",
    index: true,
    component: CartPage,
    loader: cartLoader,
  },
  {
    path: "/checkout",
    component: CheckoutLayout,
    loader: checkoutLoader,
  },
  {
    path: "/checkout/shipping",
    index: true,
    component: ShippingPage,
    loader: shippingLoader,
  },
  {
    path: "/checkout/payment",
    index: true,
    component: PaymentPage,
    loader: paymentLoader,
  },
  {
    path: "/checkout/confirm",
    index: true,
    component: ConfirmPage,
    loader: confirmLoader,
  },
  {
    path: "/orders/:orderId",
    component: OrderDetailPage,
    loader: orderDetailLoader,
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];
