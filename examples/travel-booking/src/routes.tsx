import type { RouterRouteDefinition } from "@pera1/react";

import BookingLayout, {
  loader as bookingLayoutLoader,
} from "./pages/booking/layout.js";
import BookingPage, {
  loader as bookingLoader,
} from "./pages/booking/index.js";
import CompletePage, {
  loader as completeLoader,
} from "./pages/booking/complete.js";
import ConfirmPage, {
  loader as confirmLoader,
} from "./pages/booking/confirm.js";
import PassengersPage, {
  loader as passengersLoader,
} from "./pages/booking/passengers.js";
import PaymentPage, {
  loader as paymentLoader,
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
    component: RootLayout,
    children: [
      {
        index: true,
        component: HomePage,
      },
      {
        path: "travel",
        component: TravelLayout,
        loader: travelLoader,
        children: [
          {
            path: "search",
            index: true,
            component: SearchPage,
            loader: searchLoader,
          },
          {
            path: "search/results",
            index: true,
            component: ResultsPage,
            loader: resultsLoader,
          },
          {
            path: "booking/:bookingId",
            component: BookingLayout,
            loader: bookingLayoutLoader,
            children: [
              {
                index: true,
                component: BookingPage,
                loader: bookingLoader,
              },
              {
                path: "passengers",
                index: true,
                component: PassengersPage,
                loader: passengersLoader,
              },
              {
                path: "payment",
                index: true,
                component: PaymentPage,
                loader: paymentLoader,
              },
              {
                path: "confirm",
                index: true,
                component: ConfirmPage,
                loader: confirmLoader,
              },
              {
                path: "complete",
                index: true,
                component: CompletePage,
                loader: completeLoader,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];
