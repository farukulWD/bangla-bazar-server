import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { orderServices, TOrderScope } from "./order.services";
import { ORDER_EXPORT_HEADER, orderToCsvRows, toInvoice } from "./order.utils";

const getCheckoutOptions = catchAsync(async (_req, res) => {
  const result = orderServices.getCheckoutOptions();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Checkout options fetched successfully",
    data: result,
  });
});

const listOrders = (scope: TOrderScope) =>
  catchAsync(async (req, res) => {
    const caller = req.user as TAuthUser;
    const { data, pagination } = await orderServices.listOrders(
      caller,
      req.query,
      scope,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Orders fetched successfully",
      data,
      pagination,
    });
  });

const orderStats = (scope: TOrderScope) =>
  catchAsync(async (req, res) => {
    const caller = req.user as TAuthUser;
    const result = await orderServices.getStats(caller, scope);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order stats fetched successfully",
      data: result,
    });
  });

const exportOrders = (scope: TOrderScope) =>
  catchAsync(async (req, res) => {
    const caller = req.user as TAuthUser;

    const { cursor } = await orderServices.exportOrders(
      caller,
      req.query,
      scope,
    );

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.write("\uFEFF");
    res.write(ORDER_EXPORT_HEADER);

    try {
      for await (const order of cursor) {
        for (const row of orderToCsvRows(order)) {
          // Respect backpressure: a slow client must not make us buffer the whole
          // export in the socket.
          if (!res.write(row)) {
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
      }

      res.end();
    } catch (error) {
      // The headers are long gone, so there is no status left to change.
      await cursor.close().catch(() => undefined);
      res.destroy(error as Error);
    }
  });

const getOrderById = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await orderServices.getOrder(caller, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order fetched successfully",
    data: result,
  });
});

const getOrderInvoice = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const order = await orderServices.getOrder(caller, req.params.id);
  const invoice = toInvoice(order);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.invoice}.json"`,
  );

  res.setHeader("Cache-Control", "no-store, private");

  res.end(JSON.stringify(invoice, null, 2));
});

const placeOrder = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await orderServices.placeOrder(owner._id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await orderServices.cancelOrder(caller, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await orderServices.updateStatus(
    caller,
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

const updatePaymentStatus = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await orderServices.updatePaymentStatus(
    caller,
    req.params.id,
    req.body.paymentStatus,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment status updated successfully",
    data: result,
  });
});

export const orderController = {
  getCheckoutOptions,
  // Customer-facing: always the caller's own orders.
  getMyOrders: listOrders("mine"),
  getMyOrderStats: orderStats("mine"),
  exportMyOrders: exportOrders("mine"),
  // Staff-facing: gated by ViewOrders on the route.
  getOrders: listOrders("store"),
  getOrderStats: orderStats("store"),
  exportOrders: exportOrders("store"),
  getOrderById,
  getOrderInvoice,
  placeOrder,
  cancelOrder,
  updateOrderStatus,
  updatePaymentStatus,
};
