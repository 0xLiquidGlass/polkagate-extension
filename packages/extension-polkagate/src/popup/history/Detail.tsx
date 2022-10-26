// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Divider, Grid, Link, Typography } from '@mui/material';
import React, { useCallback, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { BN } from '@polkadot/util';

import { AccountContext, ActionContext, CopyAddressButton, FormatBalance2, PButton } from '../../components';
import { useTranslation } from '../../hooks';
import { HeaderBrand } from '../../partials';
import getLogo from '../../util/getLogo';
import { accountName, toShortAddress, upperCaseFirstChar } from '../../util/utils';

export default function Detail(): React.ReactElement {
  const { t } = useTranslation();
  const onAction = useContext(ActionContext);
  const { accounts } = useContext(AccountContext);

  const { state: { chainName, info, decimal, token, path } } = useLocation();
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
  const subscanLink = () => 'https://' + chainName + '.subscan.io/extrinsic/' + String(info?.extrinsicHash);

  const _onBack = useCallback(() => {
    path && onAction(path);
  }, [onAction, path]);

  const action = useMemo((): string | undefined => {
    if (info?.transfer) {
      if (info?.id.includes('to')) {
        return t('Receive');
      }

      return t('Send');
    }

    if (info?.extrinsic) {
      return upperCaseFirstChar(info?.extrinsic.module);
    }
  }, [info, t]);

  const subAction = useMemo((): string | undefined => {
    if (info?.extrinsic) {
      return upperCaseFirstChar(info?.extrinsic.call);
    }
  }, [info]);

  const success = useMemo((): boolean =>
    !!(info?.extrinsic?.success || info?.transfer?.success || info?.reward?.success)
    , [info]);

  const from = useMemo(() => {
    const name = accountName(accounts, info?.transfer?.from);

    if (info?.transfer) {
      return `${t('From')}:  ${name ?? ''}${name ? '(' : ''}${toShortAddress(info.transfer.from)}${name ? ')' : ''}`;
    }
  }, [accounts, info?.transfer, t]);

  const to = useMemo(() => {
    const name = accountName(accounts, info?.transfer?.to);

    if (info?.transfer) {
      return `${t('To')}: ${name ?? ''}${name ? '(' : ''}${toShortAddress(info.transfer.to)}${name ? ')' : ''}`;
    }
  }, [info, t]);

  const amount = useMemo((): string | undefined => {
    if (info?.transfer) {
      return info.transfer.amount;
    }
  }, [info]);

  const fee = useMemo((): string | undefined => {
    if (info?.transfer) {
      return info.transfer.fee;
    }

    if (info?.extrinsic) {
      return info.extrinsic.fee;
    }
  }, [info]);

  const Item = ({ item, mt = 0, noDivider = false, toCopy }: { item: string | undefined, mt?: number, noDivider?: boolean, toCopy?: string }) => (
    <>
      {item &&
        <>
          <Grid container justifyContent='center' alignItems='center'>
            <Grid item>
              <Typography
                fontSize='16px'
                fontWeight={400}
                sx={{ mt: `${mt}px` }}
              >
                {item}
              </Typography>
            </Grid>
            <Grid item>
              {toCopy && <CopyAddressButton
                address={toCopy}
              />}
            </Grid>
          </Grid>
          {!noDivider && <Divider
            sx={{
              bgcolor: 'secondary.light',
              height: '2px',
              m: '3px auto',
              width: '75%'
            }}
          />
          }
        </>
      }
    </>
  );

  const Amount = ({ amount, label }: { label: string, amount: string }) => (
    <Grid
      container
      fontSize='16px'
      fontWeight={400}
      item
      justifyContent='center'
      spacing={1}
    >
      <Grid item>
        {label}
      </Grid>
      <Grid item>
        <FormatBalance2 decimals={[Number(decimal)]} tokens={[token]} value={new BN(amount)} />
      </Grid>
    </Grid>
  );

  const FailSuccessIcon = () => (
    <>
      {
        success
          ? <CheckCircleIcon
            sx={{
              bgcolor: '#fff',
              borderRadius: '50%',
              color: 'success.main',
              fontSize: '54px',
              mt: '20px'
            }
            }
          />
          : <CancelIcon
            sx={{
              bgcolor: '#fff',
              borderRadius: '50%',
              color: 'warning.main',
              fontSize: '54px',
              mt: '20px'
            }}
          />
      }
      <Typography
        fontSize='16px'
        fontWeight={500}
        mt='10px'
      >
        {success ? t<string>('Completed') : t<string>('Failed')}
      </Typography>
    </>
  );

  return (
    <>
      <HeaderBrand
        onBackClick={_onBack}
        showBackArrow
        text={t<string>('Transaction Detail')}
      />
      <Grid
        alignItems='center'
        justifyContent='center'
        pt='10px'
        textAlign='center'
      >
        <Typography
          fontSize='20px'
          fontWeight={400}
        >
          {action}
        </Typography>
        <Typography
          fontSize='18px'
          fontWeight={300}
        >
          {subAction}
        </Typography>
        <Divider
          sx={{
            bgcolor: 'secondary.light',
            height: '2px',
            m: '3px auto',
            width: '35%'
          }}
        />
        <FailSuccessIcon />
        {/* <Typography
          fontSize='16px'
          fontWeight={400}
          mt='15px'
        >
          Reason
        </Typography> */}
        <Item item={info?.timestamp && (new Date(parseInt(info.timestamp) * 1000)).toLocaleDateString(undefined, options)} mt={15} />
        <Item item={from} toCopy={info?.transfer?.from} />
        <Item item={to} toCopy={info?.transfer?.to} />
        {amount &&
          <Amount label={t('Amount')} amount={amount} />
        }
        {fee &&
          <Amount label={t('Fee')} amount={fee} />
        }
        <Divider
          sx={{
            bgcolor: 'secondary.light',
            height: '2px',
            m: '3px auto',
            width: '75%'
          }}
        />
        <Item item={`${t('Block')}: #${info?.blockNumber}`} noDivider />
        <Item item={`${t('Hash')}: #${toShortAddress(info?.extrinsicHash, 6)}`} noDivider toCopy={info?.extrinsicHash} />
        <Grid item sx={{ mt: '20px' }}>
          <Link
            href={`${subscanLink()}`}
            rel='noreferrer'
            target='_blank'
            underline='none'
          >
            <Grid
              alt={'subscan'}
              component='img'
              src={getLogo('subscan')}
              sx={{ height: 40, width: 40 }}
            />
          </Link>
        </Grid>
      </Grid>
      <PButton
        _onClick={_onBack}
        text={t<string>('Back')}
      />
    </>
  );
}