// Copyright 2019-2024 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import { Grid, Typography, useTheme } from '@mui/material';
import React, { useCallback, useState } from 'react';

import { blake2AsHex } from '@polkadot/util-crypto';

import { Password, Switch, TwoButtons } from '../../components';
import { setStorage } from '../../components/Loading';
import { useTranslation } from '../../hooks';
import Passwords2 from '../newAccount/createAccountFullScreen/components/Passwords2';
import { STEPS } from './constants';
import { isPasswordCorrect } from '.';

interface Props {
  onBackClick: () => void;
  onPassChange: (pass: string | null) => void
  isPasswordError: boolean;
  setStep: React.Dispatch<React.SetStateAction<number | undefined>>;
  setIsPasswordError: React.Dispatch<React.SetStateAction<boolean>>
  newPassword: string;
}

function Modify({ isPasswordError, newPassword, onBackClick, onPassChange, setIsPasswordError, setStep }: Props): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isRemovePasswordChecked, setChecked] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');

  const onCurrentPasswordChange = useCallback((pass: string | null): void => {
    setIsPasswordError(false);
    setCurrentPassword(pass || '');
  }, [setIsPasswordError]);

  const onCheckChange = useCallback(() => {
    setChecked(!isRemovePasswordChecked);
  }, [isRemovePasswordChecked]);

  const onRemovePassword = useCallback(async () => {
    if (await isPasswordCorrect(currentPassword)) {
      const isConfirmed = await setStorage('loginInfo', { status: 'noLogin' });

      setStep(isConfirmed ? STEPS.PASSWORD_REMOVED : STEPS.ERROR);
    } else {
      setIsPasswordError(true);
    }
  }, [currentPassword, setIsPasswordError, setStep]);

  const onUpdatePassword = useCallback(async () => {
    if (!await isPasswordCorrect(currentPassword)) {
      setIsPasswordError(true);

      return;
    }

    if (newPassword) {
      const hashedPassword = blake2AsHex(newPassword, 256);
      const isConfirmed = await setStorage('loginInfo', { hashedPassword, lastLoginTime: Date.now(), status: 'set' });

      setStep(isConfirmed ? STEPS.NEW_PASSWORD_SET : STEPS.ERROR);
    }
  }, [currentPassword, newPassword, setIsPasswordError, setStep]);

  const onSet = useCallback(() => {
    if (isRemovePasswordChecked) {
      onRemovePassword().catch(console.error);
    } else {
      onUpdatePassword().catch(console.error);
    }
  }, [isRemovePasswordChecked, onRemovePassword, onUpdatePassword]);

  return (
    <>
      {!isPasswordError &&
        <Grid alignContent='center' container justifyContent='center' sx={{ height: '200px', px: '20px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 500, pb: '5px' }}>
            {t<string>('You are about to modify your password. ')}
          </Typography>
          <Typography sx={{ fontSize: '14px' }}>
            {t<string>('You can set a new password or even remove your password.')}<br />
          </Typography>
        </Grid>
      }
      <Grid container item sx={{ display: 'block', p: '10px' }}>
        <Password
          isFocused
          label={t('Current password')}
          onChange={onCurrentPasswordChange}
        />
        <Grid alignItems='center' container item justifyContent='space-between'>
          <Typography sx={{ fontSize: '14px' }}>
            {t<string>('Password Enabled')}<br />
          </Typography>
          <Switch
            changeBackground
            fontSize='17px'
            isChecked={!isRemovePasswordChecked}
            onChange={onCheckChange}
            theme={theme}
          // uncheckedLabel={t<string>('Light')}
          />
        </Grid>
        <Grid item sx={{ opacity: isRemovePasswordChecked ? 0.5 : 1, mt: '20px' }}>
          <Passwords2
            disabled={isRemovePasswordChecked}
            firstPassStyle={{ marginBlock: '8px' }}
            label={t<string>('New password')}
            onChange={onPassChange}
            onEnter={onUpdatePassword}
          />
        </Grid>
        <TwoButtons
          disabled={!currentPassword || !(newPassword || isRemovePasswordChecked)}
          ml='0'
          mt='20px'
          onPrimaryClick={onSet}
          onSecondaryClick={onBackClick}
          primaryBtnText={t<string>('Set')}
          secondaryBtnText={t<string>('Cancel')}
          width='100%'
        />
      </Grid>
    </>
  );
}

export default Modify;
