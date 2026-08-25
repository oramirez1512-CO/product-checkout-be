import { Inject, Injectable } from '@nestjs/common';
import { Customer, Delivery } from '../../domain/entities';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
  DELIVERY_REPOSITORY,
  DeliveryRepository,
} from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';
import { isUuid, isValidEmail, normalizeEmail } from '../validation';

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
    const fullName = command.fullName?.trim() ?? '';
    const phone = command.phone?.trim() || null;

    if (!email || !isValidEmail(email)) {
      return err(DomainError.validation('a valid email is required'));
    }
    if (!fullName) {
      return err(DomainError.validation('fullName is required'));
    }

    const customer = await this.customers.upsertByEmail({
      email,
      fullName,
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
    if (!isUuid(command.customerId)) {
      return err(DomainError.validation('customerId must be a valid UUID'));
    }

    const address = command.address?.trim() ?? '';
    const city = command.city?.trim() ?? '';
    const region = command.region?.trim() ?? '';
    const postalCode = command.postalCode?.trim() || null;

    if (!address) {
      return err(DomainError.validation('address is required'));
    }
    if (!city) {
      return err(DomainError.validation('city is required'));
    }
    if (!region) {
      return err(DomainError.validation('region is required'));
    }

    const customer = await this.customers.findById(command.customerId);
    if (!customer) {
      return err(DomainError.notFound('customer not found'));
    }

    const delivery = await this.deliveries.create({
      customerId: command.customerId,
      address,
      city,
      region,
      postalCode,
    });

    return ok(delivery);
  }
}
