// Copyright 2019-2022 @polkadot/extension-polkadot authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

/**
 * @description
 * this component opens unstake review page
 * */

import type { ApiPromise } from '@polkadot/api';

import { Container, Grid, useTheme } from '@mui/material';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AccountWithChildren } from '@polkadot/extension-base/background/types';
import { Chain } from '@polkadot/extension-chains/types';
import { Balance } from '@polkadot/types/interfaces';
import keyring from '@polkadot/ui-keyring';
import { BN } from '@polkadot/util';

import { AccountContext, ActionContext, Motion, PasswordUseProxyConfirm, Popup, ShowValue, Warning } from '../../../components';
import { useAccountName, useChain, useDecimal, useFormatted, useProxies, useToken, useTranslation } from '../../../hooks';
import { updateMeta } from '../../../messaging';
import { HeaderBrand, SubTitle, WaitScreen } from '../../../partials';
import Confirmation from '../../../partials/Confirmation';
import broadcast from '../../../util/api/broadcast';
import { Proxy, ProxyItem, StakingConsts, TransactionDetail, TxInfo, ValidatorInfo } from '../../../util/types';
import { getSubstrateAddress, getTransactionHistoryFromLocalStorage, prepareMetaData } from '../../../util/utils';
import TxDetail from './TxDetail';
import ValidatorsTable from './ValidatorsTable';

interface Props {
  address: string;
  api: ApiPromise | undefined;
  newSelectedValidators: ValidatorInfo[]
  poolId?: BN;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  show: boolean;
  stakingConsts: StakingConsts | undefined;
  staked: BN;
}

export default function Review({ address, api, newSelectedValidators, poolId, setShow, show, staked, stakingConsts }: Props): React.ReactElement {
  const { t } = useTranslation();
  const formatted = useFormatted(address);
  const chain = useChain(address);
  const proxies = useProxies(api, formatted);
  const token = useToken(address);
  const decimal = useDecimal(address);
  const name = useAccountName(address);
  const theme = useTheme();
  const onAction = useContext(ActionContext);
  const { accounts, hierarchy } = useContext(AccountContext);
  const [password, setPassword] = useState<string | undefined>();
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [selectedProxy, setSelectedProxy] = useState<Proxy | undefined>();
  const [proxyItems, setProxyItems] = useState<ProxyItem[]>();
  const [txInfo, setTxInfo] = useState<TxInfo | undefined>();
  const [showWaitScreen, setShowWaitScreen] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<Balance>();

  const nominated = api && (poolId ? api.tx.nominationPools.nominate : api.tx.staking.nominate);
  const params = useMemo(() => {
    const selectedValidatorsAccountId = newSelectedValidators.map((v) => v.accountId);

    return poolId ? [poolId, selectedValidatorsAccountId] : [selectedValidatorsAccountId];
  }, [newSelectedValidators, poolId]);

  const selectedProxyAddress = selectedProxy?.delegate as unknown as string;
  const selectedProxyName = useMemo(() => accounts?.find((a) => a.address === getSubstrateAddress(selectedProxyAddress))?.name, [accounts, selectedProxyAddress]);

  function saveHistory(chain: Chain, hierarchy: AccountWithChildren[], address: string, history: TransactionDetail[]) {
    if (!history.length) {
      return;
    }

    const accountSubstrateAddress = getSubstrateAddress(address);

    if (!accountSubstrateAddress) {
      return; // should not happen !
    }

    const savedHistory: TransactionDetail[] = getTransactionHistoryFromLocalStorage(chain, hierarchy, accountSubstrateAddress);

    savedHistory.push(...history);

    updateMeta(accountSubstrateAddress, prepareMetaData(chain, 'history', savedHistory)).catch(console.error);
  }

  const goToStakingHome = useCallback(() => {
    setShow(false);

    poolId ? onAction(`/pool/${address}`) : onAction(`/solo/${address}`);
  }, [address, onAction, poolId, setShow]);

  const goToMyAccounts = useCallback(() => {
    setShow(false);

    onAction('/');
  }, [onAction, setShow]);

  useEffect((): void => {
    nominated && nominated(...params).paymentInfo(formatted).then((i) => setEstimatedFee(i?.partialFee)).catch(console.error);
  }, [nominated, formatted, params]);

  useEffect((): void => {
    const fetchedProxyItems = proxies?.map((p: Proxy) => ({ proxy: p, status: 'current' })) as ProxyItem[];

    setProxyItems(fetchedProxyItems);
  }, [proxies]);

  const nominate = useCallback(async () => {
    const history: TransactionDetail[] = []; /** collects all records to save in the local history at the end */

    try {
      if (!formatted || !nominated || !api) {
        return;
      }

      const signer = keyring.getPair(selectedProxyAddress ?? formatted);

      signer.unlock(password);
      setShowWaitScreen(true);

      const { block, failureText, fee, status, txHash } = await broadcast(api, nominated, params, signer, formatted, selectedProxy);

      const info = {
        action: poolId ? 'pool_select_validator' : 'solo_select_validator',
        block,
        date: Date.now(),
        failureText,
        fee: fee || String(estimatedFee),
        from: { address: formatted, name },
        status,
        throughProxy: selectedProxyAddress ? { address: selectedProxyAddress, name: selectedProxyName } : undefined,
        txHash
      };

      history.push(info);
      setTxInfo({ ...info, api, chain });

      saveHistory(chain, hierarchy, formatted, history);

      setShowWaitScreen(false);
      setShowConfirmation(true);
    } catch (e) {
      console.log('error:', e);
      setIsPasswordError(true);
    }
  }, [api, chain, estimatedFee, poolId, formatted, hierarchy, name, nominated, params, password, selectedProxy, selectedProxyAddress, selectedProxyName]);

  const _onBackClick = useCallback(() => {
    setShow(false);
  }, [setShow]);

  return (
    <Motion>
      <Popup show={show}>
        <HeaderBrand
          onBackClick={_onBackClick}
          shortBorder
          showBackArrow
          showClose
          text={t<string>('Select Validators')}
          withSteps={{
            current: 2,
            total: 2
          }}
        />
        {isPasswordError &&
          <Grid
            color='red'
            height='30px'
            m='auto'
            mt='-10px'
            width='92%'
          >
            <Warning
              fontWeight={400}
              isBelowInput
              isDanger
              theme={theme}
            >
              {t<string>('You’ve used an incorrect password. Try again.')}
            </Warning>
          </Grid>
        }
        <SubTitle label={t('Review')} />
        <Container disableGutters sx={{ p: '15px 15px' }}>
          <Grid item textAlign='center'>
            {t('Validators ({{count}})', { replace: { count: newSelectedValidators.length } })}
          </Grid>
          <ValidatorsTable
            api={api}
            chain={chain}
            decimal={decimal}
            formatted={formatted}
            height={window.innerHeight - 320}
            staked={staked}
            stakingConsts={stakingConsts}
            token={token}
            validatorsToList={newSelectedValidators}
          />
          <Grid alignItems='center' container fontSize='14px' item justifyContent='flex-start' pt='10px'>
            <Grid item>
              {t('Fee')}:
            </Grid>
            <Grid fontWeight={400} item pl='5px'>
              <ShowValue height={16} value={estimatedFee?.toHuman()} />
            </Grid>
          </Grid>
        </Container>
        <PasswordUseProxyConfirm
          api={api}
          genesisHash={chain?.genesisHash}
          isPasswordError={isPasswordError}
          label={`${t<string>('Password')} for ${selectedProxyName || name}`}
          onChange={setPassword}
          onConfirmClick={nominate}
          proxiedAddress={formatted}
          proxies={proxyItems}
          proxyTypeFilter={['Any', 'NonTransfer']}
          selectedProxy={selectedProxy}
          setIsPasswordError={setIsPasswordError}
          setSelectedProxy={setSelectedProxy}
          style={{
            bottom: '80px',
            left: '4%',
            position: 'absolute',
            width: '92%'
          }}
        />
        <WaitScreen
          show={showWaitScreen}
          title={t('Select Validators')}
        />
        {txInfo && (
          <Confirmation
            headerTitle={t('Select Validators')}
            onPrimaryBtnClick={goToStakingHome}
            onSecondaryBtnClick={goToMyAccounts}
            primaryBtnText={t('Staking Home')}
            secondaryBtnText={t('My Accounts')}
            showConfirmation={showConfirmation}
            txInfo={txInfo}
          >
            <TxDetail txInfo={txInfo} validatorsCount={newSelectedValidators.length} />
          </Confirmation>)
        }
      </Popup>
    </Motion>
  );
}