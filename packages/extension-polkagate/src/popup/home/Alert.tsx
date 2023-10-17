// Copyright 2019-2023 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import { Grid, Typography, useTheme } from '@mui/material';
import React, { useCallback, useContext } from 'react';

import { ActionContext, PButton, Popup } from '../../components';
import useTranslation from '../../hooks/useTranslation';
import { HeaderBrand } from '../../partials';
import { NEW_VERSION_ALERT } from '../../util/constants';

interface Props {
  show: boolean;
  setShowAlert: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Alert({ setShowAlert, show }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const theme = useTheme();
  const onAction = useContext(ActionContext);

  const onClose = useCallback(() => {
    window.localStorage.setItem('In-Use Version', NEW_VERSION_ALERT);
    setShowAlert(false);
    onAction('/');
  }, [onAction, setShowAlert]);

  const UL = ({ notes }: { notes: React.ReactNode[] }) => {
    return (
      <Grid container direction='column' py='15px'>
        <Grid container item>
          <ul style={{ margin: 0, paddingLeft: '25px' }}>
            {notes.map((note, index) => (
              <li key={index} style={{ paddingBottom: '5px', paddingTop: '5px', color: `${theme.palette.secondary.light}` }}>
                <Typography color='text.primary' fontSize='14px' fontWeight={400} textAlign='left'>
                  {note}
                </Typography>
              </li>
            ))}
          </ul>
        </Grid>
      </Grid>
    );
  };

  return (
    <Popup show={show}>
      <HeaderBrand
        backgroundDefault
        noBorder
        onClose={onClose}
        showBrand
        showClose
        showCloseX
        text={t<string>('Polkagate')}
      />
      <Grid container direction='column' px='15px'>
        <Grid container item justifyContent='center' pb='20px' pt='50px'>
          <Typography fontSize='22px' fontWeight={400}>
            {t<string>('Important Updates')}
          </Typography>
        </Grid>
        <Grid container item sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'secondary.light', borderRadius: '5px', p: '10px' }}>
          <UL
            notes={[
              <span key='video-note'>
                Your funds are safer than ever with the introduction of social account recovery! (<a href='https://youtu.be/H1IBRCBo7KI' rel='noopener noreferrer' target='_blank'>Watch video</a>) 🛡️✨
              </span>,
              'Experience seamless account creation with our new full-screen mode! 📈🖥️',
              'We\'ve resolved known issues for a smoother and hassle-free experience! 🛠️🚀'
            ]}
          />
        </Grid>
      </Grid>
      <PButton _onClick={onClose} text={t<string>('Close')} />
    </Popup>
  );
}
