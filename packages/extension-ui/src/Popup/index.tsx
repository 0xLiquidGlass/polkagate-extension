// Copyright 2019-2024 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AccountJson, AccountsContext, AuthorizeRequest, MetadataRequest, SigningRequest } from '@polkadot/extension-base/background/types';
import type { SettingsStruct } from '@polkadot/ui-settings/types';

import { CurrencyItemType } from 'extension-polkagate/src/popup/homeFullScreen/partials/Currency';
import { AnimatePresence } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router';

import { PHISHING_PAGE_REDIRECT } from '@polkadot/extension-base/defaults';
import { canDerive } from '@polkadot/extension-base/utils';
import AddWatchOnly from '@polkadot/extension-polkagate/src/popup/import/addWatchOnly';
import Derive from '@polkadot/extension-polkagate/src/popup/newAccount/deriveAccount';
import FullscreenDerive from '@polkadot/extension-polkagate/src/popup/newAccount/deriveFromAccountsFullscreen';
import LoginPassword from '@polkadot/extension-polkagate/src/popup/passwordManagement';
import uiSettings from '@polkadot/ui-settings';

import { ErrorBoundary, Loading } from '../../../extension-polkagate/src/components';
import { AccountContext, AccountsAssetsContext, ActionContext, APIContext, AuthorizeReqContext, CurrencyContext, FetchingContext, MediaContext, MetadataReqContext, PricesContext, ReferendaContext, SettingsContext, SigningReqContext } from '../../../extension-polkagate/src/components/contexts';
import { getStorage, LoginInfo, updateStorage } from '../../../extension-polkagate/src/components/Loading';
import { ExtensionLockProvider } from '../../../extension-polkagate/src/context/ExtensionLockContext';
import { useAssetsOnChains } from '../../../extension-polkagate/src/hooks';
import { subscribeAccounts, subscribeAuthorizeRequests, subscribeMetadataRequests, subscribeSigningRequests } from '../../../extension-polkagate/src/messaging';
import AccountEx from '../../../extension-polkagate/src/popup/account';
import AccountFL from '../../../extension-polkagate/src/popup/accountDetailsFullScreen';
import AuthList from '../../../extension-polkagate/src/popup/authManagement';
import Authorize from '../../../extension-polkagate/src/popup/authorize/index';
import CrowdLoans from '../../../extension-polkagate/src/popup/crowdloans';
import Export from '../../../extension-polkagate/src/popup/export/Export';
import ExportAll from '../../../extension-polkagate/src/popup/export/ExportAll';
import ForgetAccount from '../../../extension-polkagate/src/popup/forgetAccount';
import Governance from '../../../extension-polkagate/src/popup/governance';
import ReferendumPost from '../../../extension-polkagate/src/popup/governance/post';
import History from '../../../extension-polkagate/src/popup/history';
import Accounts from '../../../extension-polkagate/src/popup/home/ManageHome';
import AddWatchOnlyFullScreen from '../../../extension-polkagate/src/popup/import/addWatchOnlyFullScreen';
import AttachQR from '../../../extension-polkagate/src/popup/import/attachQR';
import AttachQrFullScreen from '../../../extension-polkagate/src/popup/import/attachQrFullScreen';
import ImportLedger from '../../../extension-polkagate/src/popup/import/importLedger';
import ImportSeed from '../../../extension-polkagate/src/popup/import/importSeedFullScreen';
import RestoreJson from '../../../extension-polkagate/src/popup/import/restoreJSONFullScreen';
import ManageIdentity from '../../../extension-polkagate/src/popup/manageIdentity';
import ManageProxies from '../../../extension-polkagate/src/popup/manageProxies';
import Metadata from '../../../extension-polkagate/src/popup/metadata';
import CreateAccount from '../../../extension-polkagate/src/popup/newAccount/createAccountFullScreen';
import PhishingDetected from '../../../extension-polkagate/src/popup/PhishingDetected';
import Receive from '../../../extension-polkagate/src/popup/receive';
import Rename from '../../../extension-polkagate/src/popup/rename';
import Send from '../../../extension-polkagate/src/popup/sendFund';
import Signing from '../../../extension-polkagate/src/popup/signing';
import SocialRecovery from '../../../extension-polkagate/src/popup/socialRecovery';
import Pool from '../../../extension-polkagate/src/popup/staking/pool';
import PoolInformation from '../../../extension-polkagate/src/popup/staking/pool/myPool';
import PoolNominations from '../../../extension-polkagate/src/popup/staking/pool/nominations';
import PoolStake from '../../../extension-polkagate/src/popup/staking/pool/stake';
import CreatePool from '../../../extension-polkagate/src/popup/staking/pool/stake/createPool';
import JoinPool from '../../../extension-polkagate/src/popup/staking/pool/stake/joinPool';
import PoolUnstake from '../../../extension-polkagate/src/popup/staking/pool/unstake';
import Solo from '../../../extension-polkagate/src/popup/staking/solo';
import FastUnstake from '../../../extension-polkagate/src/popup/staking/solo/fastUnstake';
import SoloNominations from '../../../extension-polkagate/src/popup/staking/solo/nominations';
import SoloRestake from '../../../extension-polkagate/src/popup/staking/solo/restake';
import SoloPayout from '../../../extension-polkagate/src/popup/staking/solo/rewards/PendingRewards';
import SoloStake from '../../../extension-polkagate/src/popup/staking/solo/stake';
import TuneUp from '../../../extension-polkagate/src/popup/staking/solo/tuneUp';
import SoloUnstake from '../../../extension-polkagate/src/popup/staking/solo/unstake';
import { getPrices2 } from '../../../extension-polkagate/src/util/api';
import { buildHierarchy } from '../../../extension-polkagate/src/util/buildHierarchy';
import { APIs, Fetching, LatestRefs, Prices2, SavedAccountsAssets } from '../../../extension-polkagate/src/util/types';

const startSettings = uiSettings.get();

// Request permission for video, based on access we can hide/show import
async function requestMediaAccess(cameraOn: boolean): Promise<boolean> {
  if (!cameraOn) {
    return false;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ video: true });

    return true;
  } catch (error) {
    console.error('Permission for video declined', (error as Error).message);
  }

  return false;
}

function initAccountContext(accounts: AccountJson[]): AccountsContext {
  const hierarchy = buildHierarchy(accounts);
  const master = hierarchy.find(({ isExternal, type }) => !isExternal && canDerive(type));

  return {
    accounts,
    hierarchy,
    master
  };
}

export default function Popup(): React.ReactElement {
  const [accounts, setAccounts] = useState<null | AccountJson[]>(null);
  const [accountCtx, setAccountCtx] = useState<AccountsContext>({ accounts: [], hierarchy: [] });
  const [authRequests, setAuthRequests] = useState<null | AuthorizeRequest[]>(null);
  const [cameraOn, setCameraOn] = useState(startSettings.camera === 'on');
  const [mediaAllowed, setMediaAllowed] = useState(false);
  const [metaRequests, setMetaRequests] = useState<null | MetadataRequest[]>(null);
  const [signRequests, setSignRequests] = useState<null | SigningRequest[]>(null);
  const [settingsCtx, setSettingsCtx] = useState<SettingsStruct>(startSettings);
  const [apis, setApis] = useState<APIs>({});
  const [fetching, setFetching] = useState<Fetching>({});
  const [refs, setRefs] = useState<LatestRefs>({});
  const [accountsAssets, setAccountsAssets] = useState<SavedAccountsAssets | null | undefined>();
  const [currency, setCurrency] = useState<CurrencyItemType>();
  const [prices, setPrices] = useState<Prices2[]>();
  const [loginInfo, setLoginInfo] = useState<LoginInfo>();

  const addresses = accounts?.map((acc) => acc.address);
  const assetsOnChains = useAssetsOnChains(addresses);

  const initializeCurrency = useCallback(() => {
    const USD = {
      code: 'USD',
      country: 'United States',
      currency: 'Dollar',
      sign: '$'
    };
    const fetchedPrice = window.localStorage.getItem('currency');
    const parsed = fetchedPrice ? JSON.parse(fetchedPrice) as CurrencyItemType : USD;

    setCurrency(parsed);
  }, []);

  const initializePrices = useCallback(() => {
    chrome.storage.local.get('assetsPrice', (res) => {
      const parsed = res && res.assetsPrice ? JSON.parse(res.assetsPrice as string) as Prices2[] : [];

      setPrices(parsed);
    });
  }, []);

  const updatePrices = useCallback(async (currencyCode: string) => {
    const priceIds = ['polkadot', 'kusama', 'acala', 'astar', 'hydradx', 'karura', 'liquid-staking-dot', 'acala-dollar-acala', 'tether', 'usd-coin'];

    fetching.fetchingPrices = { price: true };

    let retryCount = 0;

    while (retryCount < 5) {
      try {
        await getPrices2(priceIds, currencyCode.toLowerCase());
        initializePrices();
        fetching.fetchingPrices = { price: false };
        retryCount = 5;

        return;
      } catch (error) {
        console.error(error);
        await new Promise((resolve) => setTimeout(resolve, ((retryCount + 1) * 5) * 1000));
        retryCount += 1;

        if (retryCount === 5) {
          fetching.fetchingPrices = { price: false };
        }
      }
    }
  }, [fetching, initializePrices]);

  const set = useCallback((change: Fetching) => {
    setFetching(change);
  }, []);

  const setIt = useCallback((change: APIs) => {
    setApis(change);
  }, []);

  const _onAction = useCallback(
    (to?: string): void => {
      if (to) {
        window.location.hash = to;
      }
    },
    []
  );

  useEffect(() => {
    if (!currency || (fetching.fetchingPrices && fetching.fetchingPrices?.price)) {
      return;
    }

    const price = prices?.find(({ currencyCode }) => currencyCode.toLowerCase() === currency.code.toLowerCase());

    if (price && Date.now() - price.date < 1000 * 30) {
      return;
    }

    updatePrices(currency.code).catch(console.error);
  }, [currency, fetching.fetchingPrices, fetching?.fetchingPrices?.price, prices, updatePrices]);

  useEffect(() => {
    if (assetsOnChains === undefined || !prices) {
      return;
    }

    const selectedPrice = prices.find((price) => price.currencyCode.toLowerCase() === currency?.code?.toLowerCase());
    const accsAssets = { ...assetsOnChains };

    accsAssets.balances.forEach((accountAsset) => accountAsset.assets.forEach((asset) => {
      asset.price = selectedPrice?.prices[asset.priceId]?.price;
    }));

    // eslint-disable-next-line no-void
    void chrome.storage.local.set({ accountsAssets: JSON.stringify(accsAssets) });
    setAccountsAssets(accsAssets);
  }, [assetsOnChains, currency?.code, prices, prices?.length]);

  useEffect((): void => {
    Promise.all([
      subscribeAccounts(setAccounts),
      subscribeAuthorizeRequests(setAuthRequests),
      subscribeMetadataRequests(setMetaRequests),
      subscribeSigningRequests(setSignRequests)
    ]).catch(console.error);

    uiSettings.on('change', (settings): void => {
      setSettingsCtx(settings);
      setCameraOn(settings.camera === 'on');
    });

    initializeCurrency();
    initializePrices();

    _onAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchLoginInfo = async () => {
      chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local' && 'loginInfo' in changes) {
          const newValue = changes.loginInfo.newValue as LoginInfo;

          setLoginInfo(newValue);
        }
      });
      const info = await getStorage('loginInfo') as LoginInfo;

      setLoginInfo(info);
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchLoginInfo();
  }, []);

  useEffect((): void => {
    if (!loginInfo) {
      return;
    }

    if (loginInfo.status !== 'forgot') {
      setAccountCtx(initAccountContext(accounts || []));
    } else if (loginInfo.status === 'forgot') {
      setAccountCtx(initAccountContext([]));
      const addresses = accounts?.map((account) => account.address);

      updateStorage('loginInfo', { addressesToForget: addresses }).catch(console.error);
    }
  }, [accounts, loginInfo]);

  useEffect((): void => {
    requestMediaAccess(cameraOn)
      .then(setMediaAllowed)
      .catch(console.error);
  }, [cameraOn]);

  function wrapWithErrorBoundary(component: React.ReactElement, trigger?: string): React.ReactElement {
    return <ErrorBoundary trigger={trigger}>{component}</ErrorBoundary>;
  }

  const Root = authRequests && authRequests.length
    ? wrapWithErrorBoundary(<Authorize />, 'authorize')
    : metaRequests && metaRequests.length
      ? wrapWithErrorBoundary(<Metadata />, 'metadata')
      : signRequests && signRequests.length
        ? wrapWithErrorBoundary(<Signing />, 'signing')
        : wrapWithErrorBoundary(<Accounts />, 'accounts');

  return (
    <AnimatePresence mode='wait'>
      <ExtensionLockProvider>
        <Loading>{accounts && authRequests && metaRequests && signRequests &&
          <ActionContext.Provider value={_onAction}>
            <SettingsContext.Provider value={settingsCtx}>
              <AccountContext.Provider value={accountCtx}>
                <APIContext.Provider value={{ apis, setIt }}>
                  <FetchingContext.Provider value={{ fetching, set }}>
                    <CurrencyContext.Provider value={{ currency, setCurrency }}>
                      <PricesContext.Provider value={{ prices, setPrices }}>
                        <AccountsAssetsContext.Provider value={{ accountsAssets, setAccountsAssets }}>
                          <ReferendaContext.Provider value={{ refs, setRefs }}>
                            <AuthorizeReqContext.Provider value={authRequests}>
                              <MediaContext.Provider value={cameraOn && mediaAllowed}>
                                <MetadataReqContext.Provider value={metaRequests}>
                                  <SigningReqContext.Provider value={signRequests}>
                                    <Switch>
                                      <Route path='/account/:genesisHash/:address/'>{wrapWithErrorBoundary(<AccountEx />, 'account')}</Route>
                                      <Route path='/account/create'>{wrapWithErrorBoundary(<CreateAccount />, 'account-creation')}</Route>
                                      <Route path='/fullscreenDerive/:address/'>{wrapWithErrorBoundary(<FullscreenDerive />, 'fullscreen-account-derive')}</Route>
                                      <Route path='/account/export-all'>{wrapWithErrorBoundary(<ExportAll />, 'export-all-address')}</Route>
                                      <Route path='/account/import-ledger'>{wrapWithErrorBoundary(<ImportLedger />, 'import-ledger')}</Route>
                                      <Route path='/account/import-seed'>{wrapWithErrorBoundary(<ImportSeed />, 'import-seed')}</Route>
                                      <Route path='/account/restore-json'>{wrapWithErrorBoundary(<RestoreJson />, 'restore-json')}</Route>
                                      <Route path='/account/:address/'>{wrapWithErrorBoundary(<AccountFL />, 'account')}</Route>
                                      <Route path='/auth-list'>{wrapWithErrorBoundary(<AuthList />, 'auth-list')}</Route>
                                      <Route path='/crowdloans/:address'>{wrapWithErrorBoundary(<CrowdLoans />, 'crowdloans')}</Route>
                                      <Route path='/derive/:address/locked'>{wrapWithErrorBoundary(<Derive isLocked />, 'derived-address-locked')}</Route>
                                      <Route path='/derive/:address'>{wrapWithErrorBoundary(<Derive />, 'derive-address')}</Route>
                                      <Route path='/export/:address'>{wrapWithErrorBoundary(<Export />, 'export-address')}</Route>
                                      <Route path='/forget/:address/:isExternal'>{wrapWithErrorBoundary(<ForgetAccount />, 'forget-address')}</Route>
                                      <Route path='/governance/:address/:topMenu/:postId'>{wrapWithErrorBoundary(<ReferendumPost />, 'governance')}</Route>
                                      <Route path='/governance/:address/:topMenu'>{wrapWithErrorBoundary(<Governance />, 'governance')}</Route>
                                      <Route path='/history/:address'>{wrapWithErrorBoundary(<History />, 'history')}</Route>
                                      <Route path='/import/add-watch-only'>{wrapWithErrorBoundary(<AddWatchOnly />, 'import-add-watch-only')}</Route>
                                      <Route path='/import/add-watch-only-full-screen'>{wrapWithErrorBoundary(<AddWatchOnlyFullScreen />, 'import-add-watch-only-full-screen')}</Route>
                                      <Route path='/import/attach-qr'>{wrapWithErrorBoundary(<AttachQR />, 'attach-qr')}</Route>
                                      <Route path='/import/attach-qr-full-screen'>{wrapWithErrorBoundary(<AttachQrFullScreen />, 'attach-qr-full-screen')}</Route>
                                      <Route path='/login-password'>{wrapWithErrorBoundary(<LoginPassword />, 'manage-login-password')}</Route>
                                      <Route path='/manageProxies/:address'>{wrapWithErrorBoundary(<ManageProxies />, 'manageProxies')}</Route>
                                      <Route path='/manageIdentity/:address'>{wrapWithErrorBoundary(<ManageIdentity />, 'manage-identity')}</Route>
                                      <Route path='/pool/create/:address'>{wrapWithErrorBoundary(<CreatePool />, 'pool-create')}</Route>
                                      <Route path='/pool/join/:address'>{wrapWithErrorBoundary(<JoinPool />, 'pool-join')}</Route>
                                      <Route path='/pool/stake/:address'>{wrapWithErrorBoundary(<PoolStake />, 'pool-stake')}</Route>
                                      <Route path='/pool/myPool/:address'>{wrapWithErrorBoundary(<PoolInformation />, 'pool-poolInfromation')}</Route>
                                      <Route path='/pool/nominations/:address'>{wrapWithErrorBoundary(<PoolNominations />, 'pool-nominations')}</Route>
                                      <Route path='/pool/unstake/:address'>{wrapWithErrorBoundary(<PoolUnstake />, 'pool-unstake')}</Route>
                                      <Route path='/pool/:address'>{wrapWithErrorBoundary(<Pool />, 'pool-staking')}</Route>
                                      <Route path='/rename/:address'>{wrapWithErrorBoundary(<Rename />, 'rename')}</Route>
                                      <Route path='/receive/:address'>{wrapWithErrorBoundary(<Receive />, 'receive')}</Route>
                                      <Route path='/send/:address/:assetId'>{wrapWithErrorBoundary(<Send />, 'send')}</Route>
                                      <Route path='/send/:address'>{wrapWithErrorBoundary(<Send />, 'send')}</Route>
                                      <Route path='/socialRecovery/:address/:closeRecovery'>{wrapWithErrorBoundary(<SocialRecovery />, 'social-recovery')}</Route>
                                      <Route path='/solo/fastUnstake/:address'>{wrapWithErrorBoundary(<FastUnstake />, 'solo-fast-unstake')}</Route>
                                      <Route path='/solo/nominations/:address'>{wrapWithErrorBoundary(<SoloNominations />, 'solo-nominations')}</Route>
                                      <Route path='/solo/payout/:address'>{wrapWithErrorBoundary(<SoloPayout />, 'solo-payout')}</Route>
                                      <Route path='/solo/restake/:address'>{wrapWithErrorBoundary(<SoloRestake />, 'solo-restake')}</Route>
                                      <Route path='/solo/stake/:address'>{wrapWithErrorBoundary(<SoloStake />, 'solo-stake')}</Route>
                                      <Route path='/solo/unstake/:address'>{wrapWithErrorBoundary(<SoloUnstake />, 'solo-unstake')}</Route>
                                      <Route path='/solo/:address'>{wrapWithErrorBoundary(<Solo />, 'solo-staking')}</Route>
                                      {/* <Route exact path='/send/review/:genesisHash/:address/:formatted/:assetId'>{wrapWithErrorBoundary(<Review />, 'review')}</Route> */}
                                      <Route path='/tuneup/:address'>{wrapWithErrorBoundary(<TuneUp />, 'tuneup')}</Route>
                                      <Route path={`${PHISHING_PAGE_REDIRECT}/:website`}>{wrapWithErrorBoundary(<PhishingDetected />, 'phishing-page-redirect')}</Route>
                                      <Route exact path='/'>{Root}</Route>
                                    </Switch>
                                  </SigningReqContext.Provider>
                                </MetadataReqContext.Provider>
                              </MediaContext.Provider>
                            </AuthorizeReqContext.Provider>
                          </ReferendaContext.Provider>
                        </AccountsAssetsContext.Provider>
                      </PricesContext.Provider>
                    </CurrencyContext.Provider>
                  </FetchingContext.Provider>
                </APIContext.Provider>
              </AccountContext.Provider>
            </SettingsContext.Provider>
          </ActionContext.Provider>
        }</Loading>
      </ExtensionLockProvider>
    </AnimatePresence>
  );
}
