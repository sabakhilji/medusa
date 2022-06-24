import { IsEmail, IsOptional, IsString } from "class-validator"
import CustomerService from "../../../../services/customer"
import { validator } from "../../../../utils/validator"
import { AuthService } from "../../../../services"

/**
 * @oas [post] /customers
 * operationId: PostCustomers
 * summary: Create a Customer
 * description: "Creates a Customer account."
 * parameters:
 *   - (body) email=* {string} The Customer's email address.
 *   - (body) first_name=* {string} The Customer's first name.
 *   - (body) last_name=* {string} The Customer's last name.
 *   - (body) password=* {string} The Customer's password for login.
 *   - (body) phone {string} The Customer's phone number.
 * tags:
 *   - Customer
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           properties:
 *             customer:
 *               $ref: "#/components/schemas/customer"
 */
export default async (req, res) => {
  const validated = await validator(StorePostCustomersReq, req.body)

  const customerService: CustomerService = req.scope.resolve("customerService")
  await customerService.create(validated)

  const authService: AuthService = req.scope.resolve("authService")
  const authStrategy = await authService.retrieveAuthenticationStrategy(
    req,
    "store"
  )
  await authStrategy.authenticate(req, res)
}

export class StorePostCustomersReq {
  @IsString()
  first_name: string

  @IsString()
  last_name: string

  @IsEmail()
  email: string

  @IsString()
  password: string

  @IsOptional()
  @IsString()
  phone?: string
}
