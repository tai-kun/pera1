import type { RouterRouteDefinition } from "@pera1/react";

import BookingLayout, {
  loader as bookingLayoutLoader,
  shouldReload as bookingLayoutShouldReload,
} from "./pages/booking/layout.js";
import BookingPage, {
  loader as bookingLoader,
  shouldReload as bookingShouldReload,
} from "./pages/booking/index.js";
import CompletePage, {
  loader as completeLoader,
  shouldReload as completeShouldReload,
} from "./pages/booking/complete.js";
import ConfirmPage, {
  loader as confirmLoader,
  shouldReload as confirmShouldReload,
} from "./pages/booking/confirm.js";
import PassengersPage, {
  loader as passengersLoader,
  shouldReload as passengersShouldReload,
} from "./pages/booking/passengers.js";
import PaymentPage, {
  loader as paymentLoader,
  shouldReload as paymentShouldReload,
} from "./pages/booking/payment.js";
import HomePage from "./pages/index.js";
import NotFoundPage from "./pages/not-found.js";
import RootLayout from "./pages/root.js";
import TravelLayout, { loader as travelLoader } from "./pages/travel/layout.js";
import ResultsPage, { loader as resultsLoader } from "./pages/travel/results.js";
import SearchPage, { loader as searchLoader } from "./pages/travel/search.js";

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
    path: "/travel",
    component: TravelLayout,
    loader: travelLoader,
  },
  {
    path: "/travel/search",
    index: true,
    component: SearchPage,
    loader: searchLoader,
  },
  {
    path: "/travel/search/results",
    index: true,
    component: ResultsPage,
    loader: resultsLoader,
  },
  {
    path: "/travel/booking/:bookingId",
    component: BookingLayout,
    loader: bookingLayoutLoader,
    shouldReload: bookingLayoutShouldReload,
  },
  {
    path: "/travel/booking/:bookingId",
    index: true,
    component: BookingPage,
    loader: bookingLoader,
    shouldReload: bookingShouldReload,
  },
  {
    path: "/travel/booking/:bookingId/passengers",
    index: true,
    component: PassengersPage,
    loader: passengersLoader,
    shouldReload: passengersShouldReload,
  },
  {
    path: "/travel/booking/:bookingId/payment",
    index: true,
    component: PaymentPage,
    loader: paymentLoader,
    shouldReload: paymentShouldReload,
  },
  {
    path: "/travel/booking/:bookingId/confirm",
    index: true,
    component: ConfirmPage,
    loader: confirmLoader,
    shouldReload: confirmShouldReload,
  },
  {
    path: "/travel/booking/:bookingId/complete",
    index: true,
    component: CompletePage,
    loader: completeLoader,
    shouldReload: completeShouldReload,
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];
