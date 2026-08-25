import { Body, Controller, Post } from '@nestjs/common';
import {
  CreateDeliveryUseCase,
  UpsertCustomerUseCase,
} from '../../application/use-cases/checkout.use-cases';
import {
  CreateDeliveryBodyDto,
  toCustomerResponse,
  toDeliveryResponse,
  UpsertCustomerBodyDto,
} from '../dto';
import { unwrapResult } from '../http/map-result';

@Controller()
export class CheckoutController {
  constructor(
    private readonly upsertCustomer: UpsertCustomerUseCase,
    private readonly createDelivery: CreateDeliveryUseCase,
  ) {}

  @Post('customers')
  async upsert(@Body() body: UpsertCustomerBodyDto) {
    return toCustomerResponse(
      unwrapResult(
        await this.upsertCustomer.execute({
          email: body?.email,
          fullName: body?.fullName,
          phone: body?.phone,
        }),
      ),
    );
  }

  @Post('deliveries')
  async createDeliveryEndpoint(@Body() body: CreateDeliveryBodyDto) {
    return toDeliveryResponse(
      unwrapResult(
        await this.createDelivery.execute({
          customerId: body?.customerId,
          address: body?.address,
          city: body?.city,
          region: body?.region,
          postalCode: body?.postalCode,
        }),
      ),
    );
  }
}
