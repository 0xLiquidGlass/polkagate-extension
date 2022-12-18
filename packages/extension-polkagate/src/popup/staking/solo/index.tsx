// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import '@vaadin/icons';

import type { ApiPromise } from '@polkadot/api';
import type { PoolStakingConsts, SoloSettings, StakingConsts } from '../../../util/types';

import { faHand, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ArrowForwardIos as ArrowForwardIosIcon } from '@mui/icons-material';
import { Box, Container, Divider, Grid, useTheme } from '@mui/material';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useHistory, useLocation } from 'react-router-dom';

import { BN, BN_ZERO } from '@polkadot/util';

import { soloSetting, soloSettingB } from '../../../assets/icons';
import { ActionContext, FormatBalance, HorizontalMenuItem, Identicon, ShowBalance } from '../../../components';
import { useApi, useBalances, useChain, useFormatted, useIdentity, useNominator, useStakingAccount, useStakingConsts, useStakingRewards, useStashId, useTranslation } from '../../../hooks';
import { HeaderBrand } from '../../../partials';
import BouncingSubTitle from '../../../partials/BouncingSubTitle';
import { BALANCES_VALIDITY_PERIOD, DATE_OPTIONS, TIME_TO_SHAKE_STAKE_ICON } from '../../../util/constants';
import AccountBrief from '../../account/AccountBrief';
import { getValue } from '../../account/util';
import Info from './Info';
import RedeemableWithdrawReview from './redeem';
import Settings from './settings';

interface SessionIfo {
  eraLength: number;
  eraProgress: number;
  currentEra: number;
}
interface State {
  api?: ApiPromise;
  stakingConsts?: StakingConsts;
  poolConsts?: PoolStakingConsts;
}

export default function Index(): React.ReactElement {
  const { t } = useTranslation();
  const onAction = useContext(ActionContext);
  const theme = useTheme();
  const history = useHistory();
  const { pathname, state } = useLocation<State>();
  const { address } = useParams<{ address: string }>();
  const formatted = useFormatted(address);
  const [refresh, setRefresh] = useState<boolean>(false);
  const stashId = useStashId(formatted);
  const stakingAccount = useStakingAccount(address, state?.stakingAccount, refresh, setRefresh);
  const chain = useChain(address);
  const rewards = useStakingRewards(address);
  const api = useApi(address, state?.api);
  const stakingConsts = useStakingConsts(address, state?.stakingConsts);
  const balances = useBalances(address, refresh, setRefresh);
  const nominatorInfo = useNominator(address);
  const identity = useIdentity(address);

  const redeemable = useMemo(() => stakingAccount?.redeemable, [stakingAccount?.redeemable]);
  const staked = useMemo(() => stakingAccount?.stakingLedger?.active, [stakingAccount?.stakingLedger?.active]);
  const decimal = stakingAccount?.decimal;
  const token = stakingAccount?.token;
  const isBalanceOutdated = useMemo(() => stakingAccount && Date.now() - stakingAccount.date > BALANCES_VALIDITY_PERIOD, [stakingAccount]);

  const [unlockingAmount, setUnlockingAmount] = useState<BN | undefined>(state?.unlockingAmount);
  const [sessionInfo, setSessionInfo] = useState<SessionIfo>();
  const [toBeReleased, setToBeReleased] = useState<{ date: number, amount: BN }[]>();
  const [showUnlockings, setShowUnlockings] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showRedeemableWithdraw, setShowRedeemableWithdraw] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false); //  to shake to persuade to stake ;)

  const _toggleShowUnlockings = useCallback(() => setShowUnlockings(!showUnlockings), [showUnlockings]);

  useEffect(() => {
    api && api.derive.session?.progress().then((sessionInfo) => {
      setSessionInfo({
        currentEra: Number(sessionInfo.currentEra),
        eraLength: Number(sessionInfo.eraLength),
        eraProgress: Number(sessionInfo.eraProgress)
      });
    });
  }, [api]);

  useEffect(() => {
    if (stakingAccount?.stakingLedger?.active?.isZero()) {
      setShake(true);
      setTimeout(() => setShake(false), TIME_TO_SHAKE_STAKE_ICON);
    }
  }, [stakingAccount?.stakingLedger.active]);

  useEffect(() => {
    if (!stakingAccount || !sessionInfo) {
      return;
    }

    let unlockingValue = BN_ZERO;
    const toBeReleased = [];

    if (stakingAccount?.unlocking) {
      for (const [_, { remainingEras, value }] of Object.entries(stakingAccount.unlocking)) {
        if (remainingEras.gtn(0)) {
          const amount = new BN(value as string);

          unlockingValue = unlockingValue.add(amount);

          const secToBeReleased = (Number(remainingEras) * sessionInfo.eraLength + (sessionInfo.eraLength - sessionInfo.eraProgress)) * 6;

          toBeReleased.push({ amount, date: Date.now() + (secToBeReleased * 1000) });
        }
      }
    }

    setToBeReleased(toBeReleased);
    setUnlockingAmount(unlockingValue);
  }, [sessionInfo, stakingAccount]);

  const onBackClick = useCallback(() => {
    const url = chain?.genesisHash ? `/account/${chain.genesisHash}/${address}/` : '/';

    onAction(url);
  }, [address, chain?.genesisHash, onAction]);

  const goToStake = useCallback(() => {
    history.push({
      pathname: `/solo/stake/${address}`,
      state: { api, pathname, stakingConsts }
    });
  }, [address, api, history, pathname, stakingConsts]);

  const goToUnstake = useCallback(() => {
    history.push({
      pathname: `/solo/unstake/${address}`,
      state: { api, balances, pathname, redeemable, stakingAccount, stakingConsts, unlockingAmount }
    });
  }, [history, address, api, balances, pathname, redeemable, stakingConsts, unlockingAmount, stakingAccount]);

  const goToRestake = useCallback(() => {
    history.push({
      pathname: `/solo/restake/${address}`,
      state: { api, balances, pathname, stakingAccount, stakingConsts, unlockingAmount }
    });
  }, [history, address, api, balances, pathname, stakingConsts, unlockingAmount, stakingAccount]);

  const goToNominations = useCallback(() => {
    history.push({
      pathname: `/solo/nominations/${address}`,
      state: { api, balances, pathname, redeemable, stakingAccount, stakingConsts, unlockingAmount }
    });
  }, [history, address, api, balances, pathname, redeemable, stakingAccount, stakingConsts, unlockingAmount]);

  const goToInfo = useCallback(() => {
    setShowInfo(true);
  }, []);

  const goToSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const goToRedeemableWithdraw = useCallback(() => {
    redeemable && !redeemable?.isZero() && setShowRedeemableWithdraw(true);
  }, [redeemable]);

  const goToDetail = useCallback(() => {
    !rewards?.isZero() && history.push({
      pathname: `/solo/reward/${String(address)}`,
      state: { api, chain }
    });
  }, [rewards, history, address, api, chain]);

  const ToBeReleased = () => (
    <Grid container sx={{ borderTop: '1px solid', borderTopColor: 'secondary.main', fontSize: '16px', fontWeight: 500, ml: '7%', mt: '2px', width: '95%' }}>
      <Grid item pt='10px' xs={12}>
        {t('To be released')}
      </Grid>
      {toBeReleased?.map(({ amount, date }) => (
        <Grid container item key={date} spacing='15px' sx={{ fontSize: '16px', fontWeight: 500 }}>
          <Grid fontWeight={300} item>
            {new Date(date).toLocaleDateString(undefined, DATE_OPTIONS)}
          </Grid>
          <Grid fontWeight={400} item>
            <FormatBalance api={api} decimalPoint={4} value={amount} />
          </Grid>
        </Grid>))
      }
    </Grid>
  );

  const Row = ({ label, link1Text, link2Text, onLink1, onLink2, showDivider = true, value }: { label: string, value: BN | undefined, link1Text?: Text, onLink1?: () => void, link2Text?: Text, onLink2?: () => void, showDivider?: boolean }) => {
    return (
      <>
        <Grid alignItems='center' container justifyContent='space-between' pt='10px'>
          <Grid item sx={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.015em' }} xs={5}>
            {label}
          </Grid>
          <Grid container item justifyContent='flex-end' xs>
            <Grid alignItems='flex-end' container direction='column' item xs>
              <Grid item sx={{ color: isBalanceOutdated ? 'primary.light' : 'text.primary', fontSize: '20px', fontWeight: 400, lineHeight: '20px' }} >
                <ShowBalance api={api} balance={value} decimal={decimal} decimalPoint={4} token={token} />
              </Grid>
              <Grid container item justifyContent='flex-end' sx={{ fontSize: '16px', fontWeight: 400, letterSpacing: '-0.015em' }}>
                {link1Text &&
                  <Grid item onClick={onLink1} sx={{ color: !value || value?.isZero() || formatted !== stakingAccount?.controllerId ? 'text.disabled' : 'inherit', cursor: 'pointer', letterSpacing: '-0.015em', lineHeight: '36px', textDecorationLine: 'underline' }} >
                    {link1Text}
                  </Grid>
                }
                {link2Text &&
                  <>
                    <Grid alignItems='center' item justifyContent='center' mx='6px'>
                      <Divider orientation='vertical' sx={{ bgcolor: !value || value?.isZero() ? 'text.disabled' : 'text.primary', height: '19px', mt: '10px', width: '2px' }} />
                    </Grid>
                    <Grid item onClick={onLink2} sx={{ color: !value || value?.isZero() ? 'text.disabled' : 'inherit', cursor: 'pointer', letterSpacing: '-0.015em', lineHeight: '36px', textDecorationLine: 'underline' }} >
                      {link2Text}
                    </Grid>
                  </>
                }
              </Grid>
            </Grid>
            {label === 'Unstaking' &&
              <Grid alignItems='center' container item onClick={_toggleShowUnlockings} sx={{ ml: '25px' }} xs={1}>
                <ArrowForwardIosIcon
                  sx={{
                    color: !toBeReleased?.length ? 'text.disabled' : 'secondary.light',
                    cursor: 'pointer',
                    fontSize: 18,
                    m: 'auto',
                    stroke: !toBeReleased?.length ? 'text.disabled' : 'secondary.light',
                    strokeWidth: '2px',
                    transform: showUnlockings ? 'rotate(-90deg)' : 'rotate(90deg)'
                  }}
                />
              </Grid>
            }
          </Grid>
        </Grid>
        {label === 'Unstaking' && showUnlockings && !!toBeReleased?.length &&
          <ToBeReleased />
        }
        {showDivider &&
          <Grid container item justifyContent='center' xs={12}>
            <Divider sx={{ bgcolor: 'secondary.main', m: '2px auto', width: '100%' }} />
          </Grid>
        }
      </>
    );
  };

  const identicon = (
    <Identicon
      iconTheme={chain?.icon || 'polkadot'}
      judgement={identity?.judgements}
      prefix={chain?.ss58Format ?? 42}
      size={40}
      value={String(formatted)}
    />
  );

  return (
    <>
      <HeaderBrand
        _centerItem={identicon}
        noBorder
        onBackClick={onBackClick}
        paddingBottom={0}
        showBackArrow
        showClose
      />
      <Container disableGutters sx={{ px: '15px' }}>
        <AccountBrief address={address} identity={identity} />
        <BouncingSubTitle label={t<string>('Solo Staking')} style={{ fontSize: '20px', fontWeight: 400 }} />
        <Grid container maxHeight={window.innerHeight - 260} sx={{ overflowY: 'scroll', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', width: 0 } }}>
          <Row
            label={t('Staked')}
            link1Text={t('Unstake')}
            onLink1={staked && !staked?.isZero() && goToUnstake}
            value={staked}
          />
          <Row
            label={t('Rewards')}
            link1Text={t('Details')}
            onLink1={goToDetail}
            value={rewards}
          />
          <Row
            label={t('Redeemable')}
            link1Text={t('Withdraw')}
            onLink1={goToRedeemableWithdraw}
            value={redeemable}
          />
          <Row
            label={t('Unstaking')}
            link1Text={t('Restake')}
            onLink1={unlockingAmount && !unlockingAmount?.isZero() && goToRestake}
            value={unlockingAmount}
          />
          <Row
            label={t('Available to stake')}
            showDivider={false}
            value={getValue('available', balances)}
          />
        </Grid>
      </Container>
      <Grid container justifyContent='space-around' sx={{ borderTop: '2px solid', borderTopColor: 'secondary.main', bottom: 0, left: '4%', position: 'absolute', pt: '5px', pb: '2px', width: '92%' }}>
        <HorizontalMenuItem
          divider
          icon={
            <FontAwesomeIcon
              color={theme.palette.mode === 'dark' ? 'white' : 'black'}
              icon={faPlus}
              shake={shake}
              size='lg'
            />
          }
          onClick={goToStake}
          title={t<string>('Stake')}
        />
        <HorizontalMenuItem
          divider
          exceptionWidth={30}
          icon={
            <FontAwesomeIcon
              bounce={stakingAccount !== undefined && !stakingAccount?.nominators.length && !stakingAccount?.stakingLedger.active.isZero()} // do when has stake but does not nominations
              color={theme.palette.mode === 'dark' ? 'white' : 'black'}
              icon={faHand}
              size='lg'
            />
          }
          onClick={goToNominations}
          title={t<string>('Validators')}
        />
        {stakingAccount?.stakingLedger?.active?.gt(BN_ZERO) && stakingAccount?.controllerId === formatted &&
          <HorizontalMenuItem
            divider
            icon={<Box component='img' src={theme.palette.mode === 'dark' ? soloSetting : soloSettingB} />}
            labelMarginTop={'-7px'}
            onClick={goToSettings}
            title={t<string>('Setting')}
          />
        }
        <HorizontalMenuItem
          icon={<vaadin-icon icon='vaadin:info-circle' style={{ height: '28px', color: `${theme.palette.text.primary}` }} />}
          onClick={goToInfo}
          title={t<string>('Info')}
        />
      </Grid>
      <Info
        api={api}
        info={stakingConsts}
        nominatorInfo={nominatorInfo}
        setShowInfo={setShowInfo}
        showInfo={showInfo}
      />
      {showSettings &&
        <Settings
          address={address}
          api={api}
          setShowSettings={setShowSettings}
          showSettings={showSettings}
          stakingConsts={stakingConsts}
          stakingAccount={stakingAccount}
        />
      }
      {showRedeemableWithdraw && formatted && api && getValue('available', balances) && chain && redeemable && !redeemable?.isZero() &&
        <RedeemableWithdrawReview
          address={address}
          amount={redeemable}
          api={api}
          available={getValue('available', balances)}
          chain={chain}
          formatted={formatted}
          setRefresh={setRefresh}
          setShow={setShowRedeemableWithdraw}
          show={showRedeemableWithdraw}
        />}
    </>
  );
}
