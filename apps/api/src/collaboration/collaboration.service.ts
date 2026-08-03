import { createHash, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { NegotiationItemStatus } from '@kal-flow/database';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AddNegotiationMessageDto, CreateContactDto, CreateCounterpartyDto, CreateNegotiationDto, CreateSignaturePacketDto, SignatureProviderEventDto, UpdateCounterpartyDto } from './dto';

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listCounterparties(organizationId: string) {
    return this.prisma.client.counterparty.findMany({ where: { organizationId }, include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] }, _count: { select: { contracts: true, negotiations: true } } }, orderBy: [{ status: 'asc' }, { legalName: 'asc' }] });
  }

  async createCounterparty(organizationId: string, principal: AuthenticatedPrincipal, input: CreateCounterpartyDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const counterparty = await tx.counterparty.create({ data: { organizationId, legalName: input.legalName.trim(), tradeName: input.tradeName?.trim(), type: input.type, tin: input.tin?.trim(), registrationNumber: input.registrationNumber?.trim(), country: input.country?.toUpperCase() ?? 'ET', city: input.city?.trim(), address: input.address?.trim(), riskNote: input.riskNote?.trim() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'counterparty.created', entityType: 'counterparty', entityId: counterparty.id, metadata: { legalName: counterparty.legalName } });
      return counterparty;
    }).catch((error: { code?: string }) => { if (error.code === 'P2002') throw new ConflictException('A counterparty with this legal name already exists'); throw error; });
  }

  async updateCounterparty(organizationId: string, counterpartyId: string, principal: AuthenticatedPrincipal, input: UpdateCounterpartyDto) {
    const current = await this.requireCounterparty(organizationId, counterpartyId);
    return this.prisma.client.$transaction(async (tx) => {
      const result = await tx.counterparty.update({ where: { id: counterpartyId }, data: { ...input, legalName: input.legalName?.trim(), tradeName: input.tradeName?.trim(), tin: input.tin?.trim(), registrationNumber: input.registrationNumber?.trim(), city: input.city?.trim(), address: input.address?.trim(), riskNote: input.riskNote?.trim() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'counterparty.updated', entityType: 'counterparty', entityId: counterpartyId, metadata: { previousStatus: current.status, status: result.status } });
      return result;
    });
  }

  async deleteCounterparty(organizationId: string, counterpartyId: string, principal: AuthenticatedPrincipal) {
    const item = await this.prisma.client.counterparty.findFirst({ where: { id: counterpartyId, organizationId }, include: { _count: { select: { contracts: true, negotiations: true } } } });
    if (!item) throw new NotFoundException('Counterparty not found');
    if (item._count.contracts || item._count.negotiations) throw new ConflictException('Linked counterparties are retained for contractual and negotiation history; mark the record inactive instead');
    await this.prisma.client.$transaction(async (tx) => { await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'counterparty.deleted', entityType: 'counterparty', entityId: counterpartyId, metadata: { legalName: item.legalName } }); await tx.counterparty.delete({ where: { id: counterpartyId } }); });
    return { deleted: true };
  }

  async addContact(organizationId: string, counterpartyId: string, principal: AuthenticatedPrincipal, input: CreateContactDto) {
    await this.requireCounterparty(organizationId, counterpartyId);
    return this.prisma.client.$transaction(async (tx) => {
      const count = await tx.counterpartyContact.count({ where: { counterpartyId } });
      const contact = await tx.counterpartyContact.create({ data: { counterpartyId, name: input.name.trim(), title: input.title?.trim(), email: input.email?.toLowerCase(), phone: input.phone?.trim(), isPrimary: count === 0 } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'counterparty.contact_added', entityType: 'counterparty', entityId: counterpartyId, metadata: { contactId: contact.id } });
      return contact;
    });
  }

  async deleteContact(organizationId: string, counterpartyId: string, contactId: string, principal: AuthenticatedPrincipal) {
    await this.requireCounterparty(organizationId, counterpartyId);
    const contact = await this.prisma.client.counterpartyContact.findFirst({ where: { id: contactId, counterpartyId }, include: { _count: { select: { signers: true } } } });
    if (!contact) throw new NotFoundException('Counterparty contact not found');
    if (contact._count.signers) throw new ConflictException('Contacts used in signature evidence cannot be deleted');
    await this.prisma.client.$transaction(async (tx) => { await tx.counterpartyContact.delete({ where: { id: contactId } }); await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'counterparty.contact_deleted', entityType: 'counterparty', entityId: counterpartyId, metadata: { contactId } }); });
    return { deleted: true };
  }

  async linkContract(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, counterpartyId: string) {
    const counterparty = await this.requireCounterparty(organizationId, counterpartyId);
    if (counterparty.status !== 'ACTIVE') throw new ConflictException('Only active counterparties can be linked');
    const contract = await this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId } });
    if (!contract) throw new NotFoundException('Contract not found');
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.contract.update({ where: { id: contractId }, data: { counterpartyId, counterpartyName: counterparty.legalName } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.counterparty_linked', entityType: 'contract', entityId: contractId, metadata: { counterpartyId } });
      return updated;
    });
  }

  listNegotiations(organizationId: string) {
    return this.prisma.client.negotiation.findMany({ where: { organizationId }, include: { contract: { select: { id: true, contractNumber: true, title: true, status: true } }, contractVersion: { select: { id: true, versionNumber: true, title: true } }, counterparty: { select: { id: true, legalName: true } }, messages: { include: { author: { select: { displayName: true, email: true } } }, orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
  }

  async createNegotiation(organizationId: string, principal: AuthenticatedPrincipal, input: CreateNegotiationDto) {
    const version = await this.prisma.client.contractVersion.findFirst({ where: { id: input.contractVersionId, contractId: input.contractId, contract: { organizationId } }, include: { contract: true } });
    if (!version) throw new NotFoundException('Contract version not found');
    if (!['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'].includes(version.contract.status)) throw new ConflictException('Negotiations can only start before final approval');
    if (input.counterpartyId && (await this.requireCounterparty(organizationId, input.counterpartyId)).status !== 'ACTIVE') throw new ConflictException('Only an active counterparty can join a new negotiation');
    return this.prisma.client.$transaction(async (tx) => {
      const negotiation = await tx.negotiation.create({ data: { organizationId, contractId: input.contractId, contractVersionId: input.contractVersionId, counterpartyId: input.counterpartyId ?? version.contract.counterpartyId, title: input.title.trim() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'negotiation.opened', entityType: 'negotiation', entityId: negotiation.id, metadata: { contractId: input.contractId, versionNumber: version.versionNumber } });
      return negotiation;
    });
  }

  async addMessage(organizationId: string, negotiationId: string, principal: AuthenticatedPrincipal, input: AddNegotiationMessageDto) {
    await this.requireOpenNegotiation(organizationId, negotiationId);
    return this.prisma.client.$transaction(async (tx) => {
      const message = await tx.negotiationMessage.create({ data: { negotiationId, authorUserId: principal.userId, clauseReference: input.clauseReference?.trim(), message: input.message.trim(), proposedText: input.proposedText?.trim() } });
      await tx.negotiation.update({ where: { id: negotiationId }, data: { updatedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'negotiation.message_added', entityType: 'negotiation', entityId: negotiationId, metadata: { messageId: message.id, clauseReference: message.clauseReference } });
      return message;
    });
  }

  async resolveMessage(organizationId: string, negotiationId: string, messageId: string, principal: AuthenticatedPrincipal, status: NegotiationItemStatus) {
    if (status === 'OPEN') throw new BadRequestException('Use accepted, rejected, or withdrawn to resolve an item');
    await this.requireOpenNegotiation(organizationId, negotiationId);
    const item = await this.prisma.client.negotiationMessage.findFirst({ where: { id: messageId, negotiationId } });
    if (!item) throw new NotFoundException('Negotiation item not found');
    return this.prisma.client.$transaction(async (tx) => { const updated = await tx.negotiationMessage.update({ where: { id: messageId }, data: { status, resolvedAt: new Date() } }); await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'negotiation.item_resolved', entityType: 'negotiation', entityId: negotiationId, metadata: { messageId, status } }); return updated; });
  }

  async agreeNegotiation(organizationId: string, negotiationId: string, principal: AuthenticatedPrincipal) {
    const negotiation = await this.requireOpenNegotiation(organizationId, negotiationId);
    const open = await this.prisma.client.negotiationMessage.count({ where: { negotiationId, status: 'OPEN' } });
    if (open) throw new ConflictException('Resolve every open negotiation item before marking terms agreed');
    return this.prisma.client.$transaction(async (tx) => { const updated = await tx.negotiation.update({ where: { id: negotiation.id }, data: { status: 'AGREED', agreedAt: new Date() } }); await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'negotiation.agreed', entityType: 'negotiation', entityId: negotiationId }); return updated; });
  }

  listPackets(organizationId: string) {
    return this.prisma.client.signaturePacket.findMany({ where: { organizationId }, include: { contract: { select: { id: true, contractNumber: true, title: true, status: true } }, contractVersion: { select: { id: true, versionNumber: true, title: true } }, signers: { orderBy: { sequence: 'asc' } }, events: { orderBy: { createdAt: 'desc' }, take: 20 } }, orderBy: { updatedAt: 'desc' } });
  }

  async createPacket(organizationId: string, principal: AuthenticatedPrincipal, input: CreateSignaturePacketDto) {
    if (new Set(input.signers.map((item) => item.sequence)).size !== input.signers.length) throw new BadRequestException('Signer order must be unique');
    if (input.signers.map((item) => item.sequence).sort((a, b) => a - b).some((value, index) => value !== index + 1)) throw new BadRequestException('Signer order must start at 1 and remain consecutive');
    if (new Set(input.signers.map((item) => item.email.toLowerCase())).size !== input.signers.length) throw new BadRequestException('Each signer email may appear only once');
    const version = await this.prisma.client.contractVersion.findFirst({ where: { id: input.contractVersionId, contractId: input.contractId, contract: { organizationId } }, include: { contract: true } });
    if (!version) throw new NotFoundException('Contract version not found');
    if (!['APPROVED', 'ACTIVE'].includes(version.contract.status)) throw new ConflictException('Only an approved contract can be prepared for signature');
    const laterVersion = await this.prisma.client.contractVersion.count({ where: { contractId: input.contractId, versionNumber: { gt: version.versionNumber } } });
    if (laterVersion) throw new ConflictException('Choose the latest approved contract version');
    const contactIds = input.signers.flatMap((item) => item.counterpartyContactId ? [item.counterpartyContactId] : []);
    if (contactIds.length && await this.prisma.client.counterpartyContact.count({ where: { id: { in: contactIds }, counterparty: { organizationId } } }) !== new Set(contactIds).size) throw new BadRequestException('Every signer contact must belong to this organization');
    const documentSha256 = createHash('sha256').update(version.content, 'utf8').digest('hex');
    return this.prisma.client.$transaction(async (tx) => {
      const packet = await tx.signaturePacket.create({ data: { organizationId, contractId: input.contractId, contractVersionId: input.contractVersionId, createdByUserId: principal.userId, title: input.title.trim(), message: input.message?.trim(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, documentSha256, signers: { create: input.signers.map((signer) => ({ ...signer, email: signer.email.toLowerCase(), name: signer.name.trim(), role: signer.role?.trim() })) }, events: { create: { type: 'PACKET_CREATED', actorEmail: principal.email, metadata: { documentSha256, demoOnly: !process.env.ESIGN_PROVIDER_WEBHOOK_URL } } } }, include: { signers: { orderBy: { sequence: 'asc' } } } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'signature.packet_created', entityType: 'signature_packet', entityId: packet.id, metadata: { contractId: input.contractId, documentSha256 } });
      return packet;
    });
  }

  async sendPacket(organizationId: string, packetId: string, principal: AuthenticatedPrincipal) {
    const packet = await this.requirePacket(organizationId, packetId);
    if (packet.status !== 'DRAFT') throw new ConflictException('Only draft packets can be sent');
    if (packet.expiresAt && packet.expiresAt <= new Date()) throw new ConflictException('The signature packet expiry date has passed');
    const webhook = process.env.ESIGN_PROVIDER_WEBHOOK_URL;
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const result = await tx.signaturePacket.update({ where: { id: packetId }, data: { status: 'SENT', sentAt: new Date(), provider: webhook ? 'WEBHOOK' : 'INTERNAL_DEMO', signers: { updateMany: { where: { status: 'PENDING' }, data: { status: 'SENT' } } }, events: { create: { type: 'PACKET_SENT', actorEmail: principal.email, metadata: { providerConfigured: Boolean(webhook) } } } }, include: { signers: { orderBy: { sequence: 'asc' } }, contractVersion: true, contract: true } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'signature.packet_sent', entityType: 'signature_packet', entityId: packetId, metadata: { provider: result.provider } });
      return result;
    });
    if (webhook) {
      try {
        const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.ESIGN_PROVIDER_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.ESIGN_PROVIDER_WEBHOOK_SECRET}` } : {}) }, body: JSON.stringify({ packetId, title: updated.title, documentSha256: updated.documentSha256, contract: updated.contract, version: updated.contractVersion, signers: updated.signers, expiresAt: updated.expiresAt }) });
        if (!response.ok) throw new Error(`Provider returned ${response.status}`);
        const payload = await response.json().catch(() => ({})) as { id?: string };
        await this.prisma.client.signaturePacket.update({ where: { id: packetId }, data: { providerPacketId: payload.id } });
      } catch (error) {
        await this.prisma.client.signatureEvent.create({ data: { packetId, type: 'PROVIDER_DELIVERY_FAILED', metadata: { error: error instanceof Error ? error.message : 'Unknown provider error' } } });
        throw new ConflictException('The packet was recorded as sent, but the configured signature provider did not accept it; inspect the evidence log before retrying');
      }
    }
    return { ...updated, deliveryMode: webhook ? 'PROVIDER' : 'DEMO_ONLY' };
  }

  async voidPacket(organizationId: string, packetId: string, principal: AuthenticatedPrincipal) {
    const packet = await this.requirePacket(organizationId, packetId);
    if (['COMPLETED', 'VOIDED'].includes(packet.status)) throw new ConflictException('This packet can no longer be voided');
    return this.prisma.client.$transaction(async (tx) => { const updated = await tx.signaturePacket.update({ where: { id: packetId }, data: { status: 'VOIDED', voidedAt: new Date(), events: { create: { type: 'PACKET_VOIDED', actorEmail: principal.email } } } }); await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'signature.packet_voided', entityType: 'signature_packet', entityId: packetId }); return updated; });
  }

  async demoSign(organizationId: string, packetId: string, signerId: string, principal: AuthenticatedPrincipal) {
    const packet = await this.requirePacket(organizationId, packetId);
    if (packet.provider !== 'INTERNAL_DEMO') throw new ConflictException('Provider-managed signatures must be completed through the configured provider');
    if (!['SENT', 'IN_PROGRESS'].includes(packet.status)) throw new ConflictException('The packet is not awaiting signatures');
    const signer = packet.signers.find((item) => item.id === signerId);
    if (!signer || !['SENT', 'VIEWED'].includes(signer.status)) throw new ConflictException('This signer is not awaiting signature');
    const priorPending = packet.signers.some((item) => item.sequence < signer.sequence && item.status !== 'SIGNED');
    if (priorPending) throw new ConflictException('Earlier signers must complete first');
    return this.prisma.client.$transaction(async (tx) => {
      await tx.signatureSigner.update({ where: { id: signerId }, data: { status: 'SIGNED', signedAt: new Date() } });
      const remaining = await tx.signatureSigner.count({ where: { packetId, id: { not: signerId }, status: { not: 'SIGNED' } } });
      const status = remaining ? 'IN_PROGRESS' : 'COMPLETED';
      const updated = await tx.signaturePacket.update({ where: { id: packetId }, data: { status, completedAt: remaining ? undefined : new Date(), evidence: { documentSha256: packet.documentSha256, mode: 'INTERNAL_DEMO', legalEffect: 'TEST_ONLY' }, events: { create: { type: 'DEMO_SIGNATURE_RECORDED', actorEmail: principal.email, metadata: { signerId, signerEmail: signer.email, testOnly: true } } } }, include: { signers: { orderBy: { sequence: 'asc' } } } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'signature.demo_signed', entityType: 'signature_packet', entityId: packetId, metadata: { signerId, testOnly: true } });
      return updated;
    });
  }

  async providerEvent(organizationId: string, authorization: string | undefined, input: SignatureProviderEventDto) {
    const configured = process.env.ESIGN_PROVIDER_WEBHOOK_SECRET;
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!configured || configured.length !== supplied.length || !timingSafeEqual(Buffer.from(configured), Buffer.from(supplied))) throw new ForbiddenException('Invalid signature provider credential');
    const packet = await this.prisma.client.signaturePacket.findFirst({ where: { id: input.packetId, organizationId, provider: 'WEBHOOK' }, include: { signers: true } });
    if (!packet) throw new NotFoundException('Provider-managed signature packet not found');
    if (['COMPLETED', 'VOIDED', 'EXPIRED'].includes(packet.status)) return { accepted: true, terminal: true };
    const signer = packet.signers.find((item) => item.email.toLowerCase() === input.signerEmail.toLowerCase());
    if (!signer) throw new NotFoundException('Packet signer not found');
    const existing = await this.prisma.client.signatureEvent.findUnique({ where: { externalId: input.eventId } });
    if (existing) return { accepted: true, duplicate: true };
    if (input.status === 'SIGNED' && packet.signers.some((item) => item.sequence < signer.sequence && item.status !== 'SIGNED')) throw new ConflictException('Signer order violation');
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    return this.prisma.client.$transaction(async (tx) => {
      await tx.signatureSigner.update({ where: { id: signer.id }, data: { status: input.status, signedAt: input.status === 'SIGNED' ? occurredAt : undefined, declinedAt: input.status === 'DECLINED' ? occurredAt : undefined } });
      const remaining = input.status === 'SIGNED' ? await tx.signatureSigner.count({ where: { packetId: packet.id, id: { not: signer.id }, status: { not: 'SIGNED' } } }) : 1;
      const packetStatus = input.status === 'DECLINED' ? 'DECLINED' : input.status === 'SIGNED' && remaining === 0 ? 'COMPLETED' : 'IN_PROGRESS';
      await tx.signaturePacket.update({ where: { id: packet.id }, data: { status: packetStatus, providerPacketId: input.providerPacketId ?? packet.providerPacketId, completedAt: packetStatus === 'COMPLETED' ? occurredAt : undefined, evidence: packetStatus === 'COMPLETED' ? { documentSha256: packet.documentSha256, mode: 'PROVIDER', providerPacketId: input.providerPacketId ?? packet.providerPacketId } : undefined } });
      await tx.signatureEvent.create({ data: { packetId: packet.id, externalId: input.eventId, type: `PROVIDER_${input.status}`, actorEmail: signer.email, metadata: { occurredAt: occurredAt.toISOString(), providerPacketId: input.providerPacketId } } });
      return { accepted: true, packetStatus };
    }).catch((error: { code?: string }) => { if (error.code === 'P2002') return { accepted: true, duplicate: true }; throw error; });
  }

  private async requireCounterparty(organizationId: string, id: string) { const item = await this.prisma.client.counterparty.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Counterparty not found'); return item; }
  private async requireOpenNegotiation(organizationId: string, id: string) { const item = await this.prisma.client.negotiation.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Negotiation not found'); if (item.status !== 'OPEN') throw new ConflictException('This negotiation is closed'); return item; }
  private async requirePacket(organizationId: string, id: string) { const item = await this.prisma.client.signaturePacket.findFirst({ where: { id, organizationId }, include: { signers: { orderBy: { sequence: 'asc' } } } }); if (!item) throw new NotFoundException('Signature packet not found'); return item; }
}
