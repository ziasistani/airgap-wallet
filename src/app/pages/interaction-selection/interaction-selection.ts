import { DeeplinkService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet, IACMessageDefinitionObjectV3, IACMessageType, IAirGapTransaction } from '@airgap/coinlib-core'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { OperationsProvider } from 'src/app/services/operations/operations'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html',
  styleUrls: ['./interaction-selection.scss']
})
export class InteractionSelectionPage {
  public isDesktop: boolean = false
  public isLedgerSupported: boolean = false

  public interactionData: any
  private readonly wallet: AirGapMarketWallet
  private readonly airGapTxs: IAirGapTransaction[]
  private readonly type: IACMessageType
  private readonly generatedId: number

  constructor(
    public readonly platform: Platform,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly deeplinkService: DeeplinkService,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider,
    private readonly ledgerService: LedgerService
  ) {
    this.isDesktop = this.platform.is('desktop')

    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.interactionData = info.data
      this.type = info.type
      this.generatedId = info.generatedId
      this.isLedgerSupported = this.isDesktop && this.ledgerService.isProtocolSupported(this.wallet.protocol)
    }
  }

  public async offlineDeviceSign() {
    const dataQR = await this.prepareQRData({} as IACMessageDefinitionObjectV3)
    const info = {
      wallet: this.wallet,
      airGapTxs: this.airGapTxs,
      data: dataQR,
      interactionData: this.interactionData
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch((err) => console.error(err))
  }

  public async sameDeviceSign() {
    const dataQR = await this.prepareQRData({} as IACMessageDefinitionObjectV3)

    this.deeplinkService
      .sameDeviceDeeplink([dataQR])
      .then(() => {
        this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
  }

  public ledgerSign() {
    const info = {
      wallet: this.wallet,
      airGapTxs: this.airGapTxs,
      data: this.interactionData
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/ledger-sign/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async prepareQRData<T extends string | IACMessageDefinitionObjectV3>(type: T): Promise<T> {
    console.log('interactionData', this.interactionData)
    console.log('generatedId', this.generatedId)
    if (typeof type === 'string' && this.interactionData.includes('://')) {
      return this.interactionData
    }
    const generatedId = 1234567890

    // TODO return string | IACMessageDefinitionObject
    return this.operations.serializeSignRequest(this.wallet, this.interactionData, this.type, generatedId).catch((error) => {
      console.warn(`Could not serialize transaction: ${error}`)
      // TODO: Show error (toast)

      return this.interactionData // Fallback
    })
  }
}
