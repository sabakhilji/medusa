import { Type } from "class-transformer"
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"
import { OrderService } from "../../../../services"
import { Response } from "express"
import { ExtendedRequest } from "../../../../types/global"
import { Order } from "../../../../models"

/**
 * @oas [get] /orders
 * operationId: "GetOrders"
 * summary: "Look Up an Order"
 * description: "Looks for an Order with a given `display_id`, `email` pair. The `display_id`, `email` pair must match in order for the Order to be returned."
 * parameters:
 *   - (query) display_id=* {number} The display id given to the Order.
 *   - (query) email=* {string} The email of the Order with the given display_id.
 * tags:
 *   - Order
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           properties:
 *             order:
 *               $ref: "#/components/schemas/order"
 */
export default async (
  req: ExtendedRequest<Order, StoreGetOrdersParams>,
  res: Response
) => {
  const validatedQuery = req.validatedQuery
  const orderService: OrderService = req.scope.resolve("orderService")

  const orders = await orderService.list(
    {
      display_id: validatedQuery.display_id,
      email: validatedQuery.email,
    },
    req.listConfig
  )

  if (orders.length !== 1) {
    res.sendStatus(404)
    return
  }

  res.json({ order: orders[0] })
}

export class ShippingAddressPayload {
  @IsOptional()
  @IsString()
  postal_code?: string
}

export class StoreGetOrdersParams {
  @IsNumber()
  @Type(() => Number)
  display_id: number

  @IsEmail()
  email: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressPayload)
  shipping_address?: ShippingAddressPayload
}
