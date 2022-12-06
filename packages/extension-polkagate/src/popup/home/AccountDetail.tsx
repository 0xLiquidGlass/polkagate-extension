// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import '@vaadin/icons';

import { Divider, Grid, IconButton, Skeleton, Typography, useTheme } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { Chain } from '@polkadot/extension-chains/types';

import CopyAddressButton from '../../components/CopyAddressButton';
import FormatBalance2 from '../../components/FormatBalance2';
import FormatPrice from '../../components/FormatPrice';
import { useTranslation } from '../../hooks';
import useBalances from '../../hooks/useBalances';
import usePrice from '../../hooks/usePrice';
import { BALANCES_VALIDITY_PERIOD } from '../../util/constants';
import { BalancesInfo } from '../../util/types';
import { getValue } from '../account/util';

interface Props {
  address: string;
  formatted: string | undefined | null;
  name: string | undefined;
  toggleVisibility: () => void;
  chain: Chain | null;
  isHidden: boolean | undefined;
}

export default function AccountDetail({ address, chain, formatted, isHidden, name, toggleVisibility }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const theme = useTheme();
  const balances = useBalances(address);
  const price = usePrice(address);
  const isBalanceOutdated = useMemo(() => balances && Date.now() - balances.date > BALANCES_VALIDITY_PERIOD, [balances]);
  const isPriceOutdated = useMemo(() => price && Date.now() - price.date > BALANCES_VALIDITY_PERIOD, [price]);
  const [balanceToShow, setBalanceToShow] = useState<BalancesInfo>();
  const chainName = chain?.name?.replace(' Relay Chain', '')?.replace(' Network', '');

  useEffect(() => {
    if (balances?.chainName === chainName?.toLowerCase()) {
      return setBalanceToShow(balances);
    }

    setBalanceToShow(undefined);
  }, [balances, chainName]);

  const NoChainAlert = () => (
    <Grid color='text.primary' fontSize='14px' fontWeight={500}>
      {t('Select a chain to view balance')}
    </Grid>
  );

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
        : <Skeleton height={22} sx={{ my: '2.5px', transform: 'none' }} variant='text' width={103} />
      }
    </>
  );

  const Price = () => (
    <>
      {price === undefined || !balanceToShow //|| balances?.token !== price?.token
        ? <Skeleton height={22} sx={{ my: '2.5px', transform: 'none' }} variant='text' width={90} />
        : <Grid item sx={{ color: isPriceOutdated ? 'primary.light' : 'text.primary', fontWeight: 300 }}>
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
    <Grid container fontSize='18px'>
      <Balance />
      <Divider orientation='vertical' sx={{ backgroundColor: 'text.primary', height: '19px', mx: '5px', my: 'auto' }} />
      <Price />
    </Grid>);

  return (
    <Grid container direction='column' xs={7.5}>
      <Grid container direction='row' item>
        <Grid item maxWidth='65%'>
          <Typography fontSize='28px' overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
            {name}
          </Typography>
        </Grid>
        <Grid item>
          <IconButton onClick={toggleVisibility} sx={{ height: '15px', ml: '7px', mt: '13px', p: 0, width: '24px' }}>
            <vaadin-icon icon={isHidden ? 'vaadin:eye-slash' : 'vaadin:eye'} style={{ color: `${theme.palette.secondary.light}`, height: '20px' }} />
          </IconButton>
        </Grid>
        <Grid item sx={{ m: '10px 0' }}>
          <CopyAddressButton
            address={formatted || address}
            showAddress
            size={25}
          />
        </Grid>
      </Grid>
      <Grid alignItems='center' container item>
        {!chain
          ? <NoChainAlert />
          : <BalanceRow />
        }
      </Grid>
    </Grid>
  );
}
