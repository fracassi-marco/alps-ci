/**
 * Use Case: Create Invitation
 *
 * Allows tenant owners/admins to invite new members to their tenant.
 * Creates an invitation with a unique token and expiration date.
 */

import type { Invitation, Role } from '../domain/models';
import { validateEmail } from '../domain/validation';
import { randomBytes } from 'crypto';

export interface CreateInvitationInput {
  tenantId: string;
  email: string;
  role: Role;
  invitedBy: string; // userId of the person sending the invitation
}

export interface CreateInvitationOutput {
  invitation: Invitation;
}

export interface InvitationRepository {
  create(invitation: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation>;
  findById(id: string): Promise<Invitation | null>;
  findByToken(token: string): Promise<Invitation | null>;
  findByEmail(email: string): Promise<Invitation[]>;
  findPendingByTenantId(tenantId: string): Promise<Invitation[]>;
  markAsAccepted(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export class CreateInvitationUseCase {
  // Default expiration: 7 days
  private readonly DEFAULT_EXPIRATION_DAYS = 7;

  constructor(private invitationRepository: InvitationRepository) {}

  async execute(input: CreateInvitationInput): Promise<CreateInvitationOutput> {
    // Validate email
    validateEmail(input.email);

    // Validate role
    if (!['owner', 'admin', 'member'].includes(input.role)) {
      throw new Error('Invalid role. Must be one of: owner, admin, member');
    }

    // Generate unique token
    const token = this.generateToken();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.DEFAULT_EXPIRATION_DAYS);

    // Create invitation
    const invitation = await this.invitationRepository.create({
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      token,
      invitedBy: input.invitedBy,
      expiresAt,
      acceptedAt: null,
    });

    return { invitation };
  }

  private generateToken(): string {
    // Generate a secure random token (32 bytes = 64 hex characters)
    return randomBytes(32).toString('hex');
  }
}

