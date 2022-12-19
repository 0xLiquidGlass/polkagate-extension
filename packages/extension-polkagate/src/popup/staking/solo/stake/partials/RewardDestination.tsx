// Copyright 2019-2022 @polkadot/extension-polkadot authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

/**
 * @description
 * this component opens stake review page
 * */

import { Grid, Typography } from '@mui/material';
import React from 'react';

import { ShortAddress } from '../../../../../components';
import { useAccountName, useIdentity, useTranslation } from '../../../../../hooks';
import { SoloSettings } from '../../../../../util/types';

interface Props {
  settings: SoloSettings
}

export default function RewardsDestination({ settings }: Props): React.ReactElement {
  const { t } = useTranslation();
  const address: string = settings.payee === 'Staked' ? settings.stashId : settings.payee.Account;
  const payeeName = useAccountName(address)
  const payeeIdentity = useIdentity(address);

  return (
    <Grid container item justifyContent='center' sx={{ alignSelf: 'center'}}>
      <Typography sx={{ fontWeight: 300 }}>
        {t('Rewards destination')}
      </Typography>
      <Grid container item justifyContent='center' mt='5px'>
        {settings.payee === 'Staked'
          ? <Typography sx={{ fontWeight: 400 }}>
            {t('Add to staked Amount')}
          </Typography>
          : <Grid container item justifyContent='center'>
            <Grid item sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 'fit-content', maxWidth: '60%' }}>
              {payeeIdentity?.display || payeeName}
            </Grid>
            <Grid item>
              <ShortAddress address={address} inParentheses />
            </Grid>
          </Grid>
        }
      </Grid>
    </Grid>
  );
}