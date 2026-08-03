import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { ContractsService } from './contracts.service';
import { DocumentsService } from './documents.service';
import { ActivateContractDto, ConvertContractRequestDto, CreateContractRequestDto, CreateContractVersionDto, DecideReviewStepDto, SaveDocumentPagesDto, SearchDocumentsDto, StartContractReviewDto, TriageContractRequestDto, UpdateContractDto, UpdateContractRequestDto, UpdateDocumentDto } from './dto';

@ApiTags('contract requests')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/contract-requests', version: '1' })
export class ContractRequestsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post() @RequirePermissions('contract.request.create')
  create(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateContractRequestDto) {
    return this.contracts.createRequest(organizationId, principal, input);
  }

  @Get() @RequirePermissions('contract.request.read')
  list(@Param('organizationId') organizationId: string) { return this.contracts.listRequests(organizationId); }

  @Get(':requestId') @RequirePermissions('contract.request.read')
  get(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string) { return this.contracts.getRequest(organizationId, requestId); }

  @Patch(':requestId') @RequirePermissions('contract.request.create')
  update(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateContractRequestDto) {
    return this.contracts.updateRequest(organizationId, requestId, principal, input);
  }

  @Post(':requestId/submit') @RequirePermissions('contract.request.create')
  submit(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.contracts.submitRequest(organizationId, requestId, principal);
  }

  @Post(':requestId/cancel') @RequirePermissions('contract.request.create')
  cancel(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.contracts.cancelRequest(organizationId, requestId, principal);
  }

  @Post(':requestId/triage') @RequirePermissions('contract.request.triage')
  triage(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: TriageContractRequestDto) {
    return this.contracts.triageRequest(organizationId, requestId, principal, input);
  }

  @Post(':requestId/convert') @RequirePermissions('contract.request.triage')
  convert(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: ConvertContractRequestDto) {
    return this.contracts.convertRequest(organizationId, requestId, principal, input);
  }
}

@ApiTags('contracts')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/contracts', version: '1' })
export class ContractsController {
  constructor(private readonly contracts: ContractsService, private readonly documents: DocumentsService) {}

  @Get() @RequirePermissions('contract.read')
  list(@Param('organizationId') organizationId: string) { return this.contracts.listContracts(organizationId); }

  @Get(':contractId/documents') @RequirePermissions('document.read')
  listDocuments(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string) {
    return this.documents.list(organizationId, contractId);
  }

  @Post(':contractId/documents') @RequirePermissions('document.upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 25) * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, contractVersionId: { type: 'string', format: 'uuid' } } } })
  uploadDocument(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @UploadedFile() file: Express.Multer.File | undefined, @Body('contractVersionId') contractVersionId?: string) {
    return this.documents.upload(organizationId, contractId, principal, file, contractVersionId);
  }

  @Get(':contractId/documents/:documentId/download') @RequirePermissions('document.read')
  downloadDocument(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @Param('documentId') documentId: string) {
    return this.documents.download(organizationId, contractId, documentId);
  }

  @Get(':contractId') @RequirePermissions('contract.read')
  get(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string) { return this.contracts.getContract(organizationId, contractId); }

  @Patch(':contractId') @RequirePermissions('contract.manage')
  update(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateContractDto) { return this.contracts.updateContract(organizationId, contractId, principal, input); }

  @Post(':contractId/cancel') @RequirePermissions('contract.manage')
  cancel(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.contracts.cancelContract(organizationId, contractId, principal); }

  @Post(':contractId/versions') @RequirePermissions('contract.manage')
  addVersion(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateContractVersionDto) {
    return this.contracts.addVersion(organizationId, contractId, principal, input);
  }

  @Post(':contractId/review') @RequirePermissions('contract.manage')
  startReview(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: StartContractReviewDto) {
    return this.contracts.startReview(organizationId, contractId, principal, input);
  }

  @Post(':contractId/review-steps/:stepId/decision') @RequirePermissions('contract.review')
  decide(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @Param('stepId') stepId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: DecideReviewStepDto) {
    return this.contracts.decideReviewStep(organizationId, contractId, stepId, principal, input);
  }

  @Post(':contractId/activate') @RequirePermissions('contract.activate')
  activate(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: ActivateContractDto) {
    return this.contracts.activate(organizationId, contractId, principal, input);
  }
}

@ApiTags('document center')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/documents', version: '1' })
export class DocumentCenterController {
  constructor(private readonly documents: DocumentsService) {}

  @Get() @RequirePermissions('document.read')
  search(@Param('organizationId') organizationId: string, @Query() query: SearchDocumentsDto) {
    return this.documents.search(organizationId, query);
  }

  @Patch(':documentId') @RequirePermissions('document.manage')
  update(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateDocumentDto) {
    return this.documents.update(organizationId, documentId, principal, input);
  }

  @Post(':documentId/archive') @RequirePermissions('document.manage')
  archive(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.documents.archive(organizationId, documentId, principal);
  }

  @Post(':documentId/restore') @RequirePermissions('document.manage')
  restore(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.documents.restore(organizationId, documentId, principal);
  }

  @Delete(':documentId') @RequirePermissions('document.manage')
  remove(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.documents.remove(organizationId, documentId, principal);
  }

  @Get(':documentId/workspace') @RequirePermissions('document.read')
  workspace(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string) {
    return this.documents.workspace(organizationId, documentId);
  }

  @Put(':documentId/workspace') @RequirePermissions('document.manage')
  saveWorkspace(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: SaveDocumentPagesDto) {
    return this.documents.saveWorkspace(organizationId, documentId, principal, input);
  }

  @Get(':documentId/download') @RequirePermissions('document.read')
  download(@Param('organizationId') organizationId: string, @Param('documentId') documentId: string) {
    return this.documents.downloadByOrganization(organizationId, documentId);
  }
}
