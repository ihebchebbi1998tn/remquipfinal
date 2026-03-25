import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PublicLayout from "@/components/layout/PublicLayout";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ChatWidget } from "@/components/chat/ChatWidget";
import ScrollToTop from "@/components/ScrollToTop";

import HomeLandingRoute from "@/pages/HomeLandingRoute";
import { PermissionGate } from "@/components/admin/PermissionGate";

// Lazy-loaded routes
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderConfirmedPage = lazy(() => import("@/pages/OrderConfirmedPage"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("@/pages/PaymentCancelPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const CustomerDashboardPage = lazy(() => import("@/pages/CustomerDashboardPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("@/pages/admin/AdminProductEdit"));
const AdminInventory = lazy(() => import("@/pages/admin/AdminInventory"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers"));
const AdminContacts = lazy(() => import("@/pages/admin/AdminContacts"));
const AdminLanding = lazy(() => import("@/pages/admin/AdminLanding"));
const AdminCMS = lazy(() => import("@/pages/admin/AdminCMS"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminCarts = lazy(() => import("@/pages/admin/AdminCarts"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminProductLogs = lazy(() => import("@/pages/admin/AdminProductLogs"));
const AdminProductDetail = lazy(() => import("@/pages/admin/AdminProductDetail"));
const AdminDiscounts = lazy(() => import("@/pages/admin/AdminDiscounts"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminAccess = lazy(() => import("@/pages/admin/AdminAccess"));
const AdminSetupAdmins = lazy(() => import("@/pages/admin/AdminSetupAdmins"));
const UserDashboard = lazy(() => import("@/pages/UserDashboard"));
const AdminChat = lazy(() => import("@/pages/admin/AdminChat"));
const AdminApplications = lazy(() => import("@/pages/admin/AdminApplications"));
const CustomerApplicationPage = lazy(() => import("@/pages/CustomerApplicationPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return <RemquipLoadingScreen variant="fullscreen" message="Loading" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <CartProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <CookieConsent />
                <ChatWidget />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<HomeLandingRoute />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/:categorySlug" element={<ProductsPage />} />
                      <Route path="/product/:slug" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/payment-success" element={<PaymentSuccessPage />} />
                      <Route path="/payment-cancel" element={<PaymentCancelPage />} />
                      <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/account" element={<CustomerDashboardPage />} />
                      <Route path="/dashboard" element={<UserDashboard />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/terms" element={<LegalPage titleKey="legal.terms.title" contentKey="legal.terms.content" />} />
                      <Route path="/privacy" element={<LegalPage titleKey="legal.privacy.title" contentKey="legal.privacy.content" />} />
                      <Route path="/shipping" element={<LegalPage titleKey="legal.shipping.title" contentKey="legal.shipping.content" />} />
                      <Route path="/refund" element={<LegalPage titleKey="legal.refund.title" contentKey="legal.refund.content" />} />
                      <Route path="/cookie" element={<LegalPage titleKey="legal.cookie.title" contentKey="legal.cookie.content" />} />
                      <Route path="/about" element={<AboutPage />} />
                    </Route>

                    {/* Public standalone pages (no store chrome) */}
                    <Route path="/apply" element={<CustomerApplicationPage />} />

                    {/* Admin sign-in (no storefront chrome) — must be before /admin layout */}
                    <Route path="/admin/login" element={<LoginPage />} />

                    {/* Hidden internal admin setup (create new admins with full permissions) */}
                    <Route path="/admin/setup-admins" element={<AdminSetupAdmins />} />

                    {/* Admin — AdminLayout always enforces login + admin role.
                        PermissionGate adds per-page permission check on top. */}
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<PermissionGate permission="canViewDashboard"><AdminOverview /></PermissionGate>} />
                      <Route path="analytics"  element={<PermissionGate permission="canManageAnalytics"><AdminAnalytics /></PermissionGate>} />
                      <Route path="products"   element={<PermissionGate permission="canManageProducts"><AdminProducts /></PermissionGate>} />
                      <Route path="categories" element={<PermissionGate permission="canManageProducts"><AdminCategories /></PermissionGate>} />
                      <Route path="products/new"              element={<PermissionGate permission="canManageProducts"><AdminProductEdit /></PermissionGate>} />
                      <Route path="products/:productId"       element={<PermissionGate permission="canManageProducts"><AdminProductEdit /></PermissionGate>} />
                      <Route path="products/:productId/view"  element={<PermissionGate permission="canManageProducts"><AdminProductDetail /></PermissionGate>} />
                      <Route path="products/:productId/logs"  element={<PermissionGate permission="canManageProducts"><AdminProductLogs /></PermissionGate>} />
                      <Route path="inventory"      element={<PermissionGate permission="canManageInventory"><AdminInventory /></PermissionGate>} />
                      <Route path="orders"         element={<PermissionGate permission="canManageOrders"><AdminOrders /></PermissionGate>} />
                      <Route path="orders/:orderId" element={<PermissionGate permission="canManageOrders"><AdminOrders /></PermissionGate>} />
                      <Route path="carts"          element={<PermissionGate permission="canManageOrders"><AdminCarts /></PermissionGate>} />
                      <Route path="customers"      element={<PermissionGate permission="canManageCustomers"><AdminCustomers /></PermissionGate>} />
                      <Route path="customers/:customerId" element={<PermissionGate permission="canManageCustomers"><AdminCustomers /></PermissionGate>} />
                      <Route path="discounts"      element={<PermissionGate permission="canManageDiscounts"><AdminDiscounts /></PermissionGate>} />
                      <Route path="landing"        element={<PermissionGate permission="canManageCMS"><AdminLanding /></PermissionGate>} />
                      <Route path="cms"            element={<PermissionGate permission="canManageCMS"><AdminCMS /></PermissionGate>} />
                      <Route path="users"          element={<PermissionGate permission="canManageUsers"><AdminUsers /></PermissionGate>} />
                      <Route path="admin-contacts" element={<PermissionGate permission="canManageUsers"><AdminContacts /></PermissionGate>} />
                      <Route path="access"         element={<PermissionGate permission="canManageUsers"><AdminAccess /></PermissionGate>} />
                      <Route path="settings"       element={<PermissionGate permission="canEditSettings"><AdminSettings /></PermissionGate>} />
                      <Route path="chat"           element={<PermissionGate permission="canViewDashboard"><AdminChat /></PermissionGate>} />
                      <Route path="applications"   element={<PermissionGate permission="canManageCustomers"><AdminApplications /></PermissionGate>} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
