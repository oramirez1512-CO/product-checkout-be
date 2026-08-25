import { Inject, Injectable } from '@nestjs/common';
import { Customer, Delivery } from '../../domain/entities';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
  DELIVERY_REPOSITORY,
  DeliveryRepository,
} from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';
import {
  isValidEmail,
  normalizeEmail,
  optionalTrim,
  requireNonEmpty,
  requireUuid,
} from '../validation';

export type UpsertCustomerCommand = {
  email: string;
  fullName: string;
  phone?: string | null;
};

export type CreateDeliveryCommand = {
  customerId: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string | null;
};

@Injectable()
export class UpsertCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
  ) {}

  async execute(command: UpsertCustomerCommand): Promise<Result<Customer>> {
    const email = normalizeEmail(command.email ?? '');
    const fullNameResult = requireNonEmpty(command.fullName, 'fullName');
    if (!fullNameResult.ok) {
      return fullNameResult;
    }
    const phone = optionalTrim(command.phone);

    if (!email || !isValidEmail(email)) {
      return err(DomainError.validation('a valid email is required'));
    }

    const customer = await this.customers.upsertByEmail({
      email,
      fullName: fullNameResult.value,
      phone,
    });

    return ok(customer);
  }
}

@Injectable()
export class CreateDeliveryUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveries: DeliveryRepository,
  ) {}

  async execute(command: CreateDeliveryCommand): Promise<Result<Delivery>> {
    const customerIdResult = requireUuid(command.customerId, 'customerId');
    if (!customerIdResult.ok) {
      return customerIdResult;
    }

    const addressResult = requireNonEmpty(command.address, 'address');
    if (!addressResult.ok) {
      return addressResult;
    }
    const cityResult = requireNonEmpty(command.city, 'city');
    if (!cityResult.ok) {
      return cityResult;
    }
    const regionResult = requireNonEmpty(command.region, 'region');
    if (!regionResult.ok) {
      return regionResult;
    }

    const customer = await this.customers.findById(customerIdResult.value);
    if (!customer) {
      return err(DomainError.notFound('customer not found'));
    }

    const delivery = await this.deliveries.create({
      customerId: customerIdResult.value,
      address: addressResult.value,
      city: cityResult.value,
      region: regionResult.value,
      postalCode: optionalTrim(command.postalCode),
    });

    return ok(delivery);
  }
}
