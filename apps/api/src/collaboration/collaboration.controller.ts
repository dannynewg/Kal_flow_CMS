import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { Public } from '../auth/public.decorator';
import { AddNegotiationMessageDto, CreateContactDto, CreateCounterpartyDto, CreateNegotiationDto, CreateSignaturePacketDto, LinkCounterpartyDto, ResolveNegotiationMessageDto, SignatureProviderEventDto, UpdateCounterpartyDto } from './dto';
import { CollaborationService } from './collaboration.service';

@ApiTags('counterparties negotiation and signatures')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId', version: '1' })
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Get('counterparties') @RequirePermissions('counterparty.read')
  counterparties(@Param('organizationId') organizationId: string) { return this.collaboration.listCounterparties(organizationId); }
  @Post('counterparties') @RequirePermissions('counterparty.manage')
  createCounterparty(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateCounterpartyDto) { return this.collaboration.createCounterparty(organizationId, principal, input); }
  @Patch('counterparties/:counterpartyId') @RequirePermissions('counterparty.manage')
  updateCounterparty(@Param('organizationId') organizationId: string, @Param('counterpartyId') counterpartyId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateCounterpartyDto) { return this.collaboration.updateCounterparty(organizationId, counterpartyId, principal, input); }
  @Delete('counterparties/:counterpartyId') @RequirePermissions('counterparty.manage')
  deleteCounterparty(@Param('organizationId') organizationId: string, @Param('counterpartyId') counterpartyId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.deleteCounterparty(organizationId, counterpartyId, principal); }
  @Post('counterparties/:counterpartyId/contacts') @RequirePermissions('counterparty.manage')
  addContact(@Param('organizationId') organizationId: string, @Param('counterpartyId') counterpartyId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateContactDto) { return this.collaboration.addContact(organizationId, counterpartyId, principal, input); }
  @Delete('counterparties/:counterpartyId/contacts/:contactId') @RequirePermissions('counterparty.manage')
  deleteContact(@Param('organizationId') organizationId: string, @Param('counterpartyId') counterpartyId: string, @Param('contactId') contactId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.deleteContact(organizationId, counterpartyId, contactId, principal); }
  @Patch('contracts/:contractId/counterparty') @RequirePermissions('contract.manage')
  linkContract(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: LinkCounterpartyDto) { return this.collaboration.linkContract(organizationId, contractId, principal, input.counterpartyId); }

  @Get('negotiations') @RequirePermissions('negotiation.read')
  negotiations(@Param('organizationId') organizationId: string) { return this.collaboration.listNegotiations(organizationId); }
  @Post('negotiations') @RequirePermissions('negotiation.manage')
  createNegotiation(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateNegotiationDto) { return this.collaboration.createNegotiation(organizationId, principal, input); }
  @Post('negotiations/:negotiationId/messages') @RequirePermissions('negotiation.manage')
  addMessage(@Param('organizationId') organizationId: string, @Param('negotiationId') negotiationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: AddNegotiationMessageDto) { return this.collaboration.addMessage(organizationId, negotiationId, principal, input); }
  @Patch('negotiations/:negotiationId/messages/:messageId') @RequirePermissions('negotiation.manage')
  resolveMessage(@Param('organizationId') organizationId: string, @Param('negotiationId') negotiationId: string, @Param('messageId') messageId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: ResolveNegotiationMessageDto) { return this.collaboration.resolveMessage(organizationId, negotiationId, messageId, principal, input.status); }
  @Post('negotiations/:negotiationId/agree') @RequirePermissions('negotiation.manage')
  agree(@Param('organizationId') organizationId: string, @Param('negotiationId') negotiationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.agreeNegotiation(organizationId, negotiationId, principal); }

  @Get('signature-packets') @RequirePermissions('signature.read')
  packets(@Param('organizationId') organizationId: string) { return this.collaboration.listPackets(organizationId); }
  @Post('signature-packets') @RequirePermissions('signature.manage')
  createPacket(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateSignaturePacketDto) { return this.collaboration.createPacket(organizationId, principal, input); }
  @Post('signature-packets/:packetId/send') @RequirePermissions('signature.manage')
  sendPacket(@Param('organizationId') organizationId: string, @Param('packetId') packetId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.sendPacket(organizationId, packetId, principal); }
  @Post('signature-packets/:packetId/void') @RequirePermissions('signature.manage')
  voidPacket(@Param('organizationId') organizationId: string, @Param('packetId') packetId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.voidPacket(organizationId, packetId, principal); }
  @Post('signature-packets/:packetId/signers/:signerId/demo-sign') @RequirePermissions('signature.manage')
  demoSign(@Param('organizationId') organizationId: string, @Param('packetId') packetId: string, @Param('signerId') signerId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.collaboration.demoSign(organizationId, packetId, signerId, principal); }

  @Public() @Post('signature-provider/events')
  providerEvent(@Param('organizationId') organizationId: string, @Headers('authorization') authorization: string | undefined, @Body() input: SignatureProviderEventDto) { return this.collaboration.providerEvent(organizationId, authorization, input); }
}
