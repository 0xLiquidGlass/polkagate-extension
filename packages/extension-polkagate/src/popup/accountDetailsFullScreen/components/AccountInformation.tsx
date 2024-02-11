// Copyright 2019-2024 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import { faShieldHalved, faSitemap } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CheckCircleOutline as CheckIcon, InsertLinkRounded as LinkIcon } from '@mui/icons-material';
import { Divider, Grid, IconButton, Skeleton, useTheme } from '@mui/material';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiPromise } from '@polkadot/api';
import { Chain } from '@polkadot/extension-chains/types';
import { BN } from '@polkadot/util';

import { ActionContext, DisplayLogo, FormatBalance2, FormatPrice, Identicon, Identity, Infotip, ShortAddress2 } from '../../../components';
import { useAccount, useAccountInfo, useTranslation } from '../../../hooks';
import { showAccount, tieAccount, windowOpen } from '../../../messaging';
import { ACALA_GENESIS_HASH, ASSET_HUBS, BALANCES_VALIDITY_PERIOD, IDENTITY_CHAINS, KUSAMA_GENESIS_HASH, POLKADOT_GENESIS_HASH, SOCIAL_RECOVERY_CHAINS, WESTEND_GENESIS_HASH } from '../../../util/constants';
import { BalancesInfo, Price, Proxy } from '../../../util/types';
import { amountToHuman } from '../../../util/utils';
import { getValue } from '../../account/util';
import { AssetsOnOtherChains } from '..';
import AOC from './AOC';

interface AddressDetailsProps {
  address: string | undefined;
  api: ApiPromise | undefined;
  assetsOnOtherChains: AssetsOnOtherChains[] | null | undefined;
  chain: Chain | null | undefined;
  formatted: string | undefined;
  chainName: string | undefined;
  isDarkTheme: boolean;
  balances: BalancesInfo | undefined;
  price: Price | undefined;
  setAssetId: React.Dispatch<React.SetStateAction<number | undefined>>;
  assetId: number | undefined;
}

export type DisplayLogoAOC = {
  base: string | null | undefined;
  symbol: string | undefined;
}

export default function AccountInformation({ address, api, assetId, assetsOnOtherChains, balances, chain, chainName, formatted, isDarkTheme, price, setAssetId }: AddressDetailsProps): React.ReactElement {
  const { t } = useTranslation();
  const account = useAccount(address);
  const accountInfo = useAccountInfo(api, formatted);
  const theme = useTheme();
  const onAction = useContext(ActionContext);

  const [hasID, setHasID] = useState<boolean | undefined>();
  const [isRecoverable, setIsRecoverable] = useState<boolean | undefined>();
  const [hasProxy, setHasProxy] = useState<boolean | undefined>();
  const [balanceToShow, setBalanceToShow] = useState<BalancesInfo>();

  const calculatePrice = useCallback((amount: BN, decimal: number, price: number) => {
    return parseFloat(amountToHuman(amount, decimal)) * price;
  }, []);

  const borderColor = useMemo(() => isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', [isDarkTheme]);
  const isBalanceOutdated = useMemo(() => balances && Date.now() - balances.date > BALANCES_VALIDITY_PERIOD, [balances]);
  const isPriceOutdated = useMemo(() => price !== undefined && Date.now() - price.date > BALANCES_VALIDITY_PERIOD, [price]);
  const otherAssetsToShow = useMemo(() => {
    if (!assetsOnOtherChains) {
      return assetsOnOtherChains;
    } else {
      return assetsOnOtherChains.filter((asset) => !asset.totalBalance.isZero()).sort((a, b) => calculatePrice(b.totalBalance, b.decimal, b.price) - calculatePrice(a.totalBalance, a.decimal, a.price));
    }
  }, [assetsOnOtherChains, calculatePrice]);
  const recoverableToolTipTxt = useMemo(() => {
    switch (isRecoverable) {
      case true:
        return 'Recoverable';
        break;
      case false:
        return 'Not Recoverable';
        break;

      default:
        return 'Checking';
        break;
    }
  }, [isRecoverable]);
  const proxyTooltipTxt = useMemo(() => {
    if (hasProxy) {
      return 'Has Proxy';
    } else if (hasProxy === false) {
      return 'No Proxy';
    } else {
      return 'Checking';
    }
  }, [hasProxy]);

  const onAssetHub = useCallback((genesisHash: string | null | undefined) => ASSET_HUBS.includes(genesisHash ?? ''), []);
  const displayLogoAOC = useCallback((genesisHash: string | null | undefined, symbol: string | undefined): DisplayLogoAOC => {
    if (onAssetHub(genesisHash)) {
      if (ASSET_HUBS[0] === genesisHash) {
        return {
          base: WESTEND_GENESIS_HASH,
          symbol
        };
      } else if (ASSET_HUBS[1] === genesisHash) {
        return {
          base: KUSAMA_GENESIS_HASH,
          symbol
        };
      } else {
        return {
          base: POLKADOT_GENESIS_HASH,
          symbol
        };
      }
    }

    if (ACALA_GENESIS_HASH === genesisHash) {
      if (symbol?.toLowerCase() === 'aca') {
        return {
          base: ACALA_GENESIS_HASH,
          symbol: undefined
        };
      } else {
        return {
          base: undefined,
          symbol
        };
      }
    }

    return {
      base: genesisHash,
      symbol: undefined
    };
  }, [onAssetHub]);

  useEffect((): void => {
    setHasID(undefined);
    setIsRecoverable(undefined);
    setHasProxy(undefined);

    if (!api || !address || !account?.genesisHash || api.genesisHash.toHex() !== account.genesisHash) {
      return;
    }

    if (api.query.identity && IDENTITY_CHAINS.includes(account.genesisHash)) {
      api.query.identity.identityOf(formatted).then((id) => setHasID(!id.isEmpty)).catch(console.error);
    } else {
      setHasID(false);
    }

    if (api.query?.recovery && SOCIAL_RECOVERY_CHAINS.includes(account.genesisHash)) {
      api.query.recovery.recoverable(formatted).then((r) => setIsRecoverable(r.isSome)).catch(console.error);
    } else {
      setIsRecoverable(false);
    }

    api.query.proxy.proxies(formatted).then((p) => {
      const fetchedProxies = JSON.parse(JSON.stringify(p[0])) as unknown as Proxy[];

      setHasProxy(fetchedProxies.length > 0);
    }).catch(console.error);
  }, [api, address, formatted, account?.genesisHash]);

  useEffect(() => {
    if (balances?.chainName === chainName) {
      return setBalanceToShow(balances);
    }

    setBalanceToShow(undefined);
  }, [balances, chainName]);

  const Balance = () => (
    <>
      {balanceToShow?.decimal
        ? <Grid item sx={{ color: isBalanceOutdated ? 'primary.light' : 'text.primary', fontWeight: 500 }}>
          <FormatBalance2
            decimalPoint={2}
            decimals={[balanceToShow.decimal]}
            tokens={[balanceToShow.token]}
            value={getValue('total', balanceToShow)}
          />
        </Grid>
        : <Skeleton animation='wave' height={22} sx={{ my: '2.5px', transform: 'none' }} variant='text' width={90} />
      }
    </>
  );

  const Price = () => (
    <>
      {price === undefined || !balanceToShow || balanceToShow?.chainName?.toLowerCase() !== price?.chainName
        ? <Skeleton animation='wave' height={22} sx={{ my: '2.5px', transform: 'none' }} variant='text' width={80} />
        : <Grid item sx={{ '> div span': { display: 'block' }, color: isPriceOutdated ? 'primary.light' : 'text.primary', fontWeight: 400 }}>
          <FormatPrice
            amount={getValue('total', balanceToShow)}
            decimals={balanceToShow.decimal}
            price={price.amount}
          />
        </Grid>
      }
    </>
  );

  const BalanceRow = () => (
    <Grid alignItems='center' container fontSize='28px' item xs>
      <Balance />
      <Divider orientation='vertical' sx={{ backgroundColor: 'text.primary', height: '30px', mx: '10px', my: 'auto' }} />
      <Price />
    </Grid>
  );

  const AssetsBox = () => (
    <Grid alignItems='center' container item xs>
      <Grid item pl='7px'>
        <DisplayLogo assetToken={displayLogoAOC(account?.genesisHash, balanceToShow?.token)?.symbol} genesisHash={displayLogoAOC(account?.genesisHash, balanceToShow?.token)?.base} size={42} />
      </Grid>
      <Grid item sx={{ fontSize: '28px', ml: '5px' }}>
        <BalanceRow />
      </Grid>
    </Grid>
  );

  const assetBoxClicked = useCallback((genesisHash: string, id: number | undefined) => {
    address && tieAccount(address, genesisHash).finally(() => {
      id && setAssetId(id);
      (id === undefined || id === -1) && setAssetId(undefined);
    }).catch(console.error);
  }, [address, setAssetId]);

  const openIdentity = useCallback(() => {
    address && windowOpen(`/manageIdentity/${address}`);
  }, [address]);

  const openSocialRecovery = useCallback(() => {
    address && windowOpen(`/socialRecovery/${address}/false`);
  }, [address]);

  const openManageProxy = useCallback(() => {
    address && chain && onAction(`/manageProxies/${address}`);
  }, [address, chain, onAction]);

  const toggleVisibility = useCallback((): void => {
    address && showAccount(address, account?.isHidden || false).catch(console.error);
  }, [account?.isHidden, address]);

  return (
    <Grid alignItems='center' container item sx={{ bgcolor: 'background.paper', border: isDarkTheme ? '1px solid' : '0px solid', borderBottomWidth: '8px', borderColor: 'secondary.light', borderBottomColor: theme.palette.mode === 'light' ? 'black' : 'secondary.light', borderRadius: '5px', boxShadow: '2px 3px 4px 0px rgba(0, 0, 0, 0.1)', p: '20px 10px 5px 20px' }}>
      <Grid container item>
        <Grid container item sx={{ borderRight: '1px solid', borderRightColor: borderColor, pr: '8px', width: 'fit-content' }}>
          <Grid container item pr='7px' sx={{ '> div': { height: 'fit-content' }, m: 'auto', width: 'fit-content' }}>
            <Identicon
              iconTheme={chain?.icon ?? 'polkadot'}
              prefix={chain?.ss58Format ?? 42}
              size={70}
              value={formatted || address}
            />
          </Grid>
          <Grid alignItems='center' container direction='column' display='grid' item justifyContent='center' justifyItems='center' width='fit-content'>
            <Grid item onClick={openIdentity} sx={{ border: '1px solid', borderColor: 'success.main', borderRadius: '5px', cursor: 'pointer', display: hasID ? 'inherit' : 'none', height: '24px', m: 'auto', p: '2px', width: 'fit-content' }}>
              {hasID
                ? accountInfo?.identity?.displayParent
                  ? <LinkIcon sx={{ bgcolor: 'success.main', border: '1px solid', borderRadius: '50%', color: 'white', fontSize: '18px', transform: 'rotate(-45deg)' }} />
                  : <CheckIcon sx={{ bgcolor: 'success.main', border: '1px solid', borderRadius: '50%', color: 'white', fontSize: '18px' }} />
                : undefined
              }
            </Grid>
            <Grid height='24px' item width='24px'>
              <Infotip placement='right' text={t(recoverableToolTipTxt)}>
                <IconButton
                  onClick={openSocialRecovery}
                  sx={{ height: '24px', width: '24px' }}
                >
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    style={{ border: '1px solid', borderRadius: '5px', color: isRecoverable ? theme.palette.success.main : theme.palette.action.disabledBackground, fontSize: '16px', padding: '3px' }}
                  />
                </IconButton>
              </Infotip>
            </Grid>
            <Grid height='24px' item width='fit-content'>
              <Infotip placement='right' text={t(proxyTooltipTxt)}>
                <IconButton onClick={openManageProxy} sx={{ height: '16px', width: '16px' }}>
                  <FontAwesomeIcon
                    icon={faSitemap}
                    style={{ border: '1px solid', borderRadius: '5px', color: hasProxy ? theme.palette.success.main : theme.palette.action.disabledBackground, fontSize: '16px', padding: '2px' }}
                  />
                </IconButton>
              </Infotip>
            </Grid>
          </Grid>
        </Grid>
        <Grid container direction='column' item sx={{ borderRight: '1px solid', borderRightColor: borderColor, px: '7px' }} xs={5}>
          <Grid container item justifyContent='space-between'>
            <Identity
              address={address}
              api={api}
              chain={chain}
              noIdenticon
              style={{ width: 'calc(100% - 40px)' }}
              subIdOnly
            />
            <Grid item width='40px'>
              <Infotip text={account?.isHidden && t('This account is hidden from websites')}>
                <IconButton onClick={toggleVisibility} sx={{ height: '20px', ml: '7px', mt: '13px', p: 0, width: '28px' }}>
                  <vaadin-icon icon={account?.isHidden ? 'vaadin:eye-slash' : 'vaadin:eye'} style={{ color: `${theme.palette.secondary.light}`, height: '20px' }} />
                </IconButton>
              </Infotip>
            </Grid>
          </Grid>
          <Grid alignItems='center' container item sx={{ '> div div:last-child': { width: 'auto' } }} xs>
            <ShortAddress2 address={formatted} charsCount={40} showCopy style={{ fontSize: '10px', fontWeight: 300 }} />
          </Grid>
        </Grid>
        <AssetsBox />
      </Grid>
      {(otherAssetsToShow === undefined || (otherAssetsToShow && otherAssetsToShow?.length > 0)) &&
        <>
          <Divider sx={{ bgcolor: borderColor, height: '1px', my: '15px', width: '95%' }} />
          <AOC
            account={account}
            api={api}
            assetId={assetId}
            assetsOnOtherChains={otherAssetsToShow}
            balanceToShow={balanceToShow}
            borderColor={borderColor}
            displayLogoAOC={displayLogoAOC}
            mode='Detail'
            onclick={assetBoxClicked}
          />
        </>
      }
    </Grid>
  );
}
