// Copyright 2019-2022 @polkadot/extension-plus authors & contributors
// SPDX-License-Identifier: Apache-2.0

/** 
 * @description  this component is used to show an account balance in some pages like contributeToCrowdloan
 * */
import type { Balance } from '@polkadot/types/interfaces';
import type { BN } from '@polkadot/util';

import { GridDirection, Skeleton } from '@mui/material';
import { ResponsiveStyleValue } from '@mui/system';
import React from 'react';

import { ApiPromise } from '@polkadot/api';

import FormatBalance from './FormatBalance';

export interface Props {
  value: number | string | BN | null | undefined;
  title?: string;
  direction?: ResponsiveStyleValue<GridDirection> | undefined;
  decimalPoint?: number;
  height?: number;
  unit?: string;
}

export default function ShowValue({ value, decimalPoint = 2, unit, height = 20 }: Props): React.ReactElement<Props> {
  return (
    <>
      {value !== undefined
        ? <>
          {value}{' '}{unit}
        </>
        : <Skeleton
          height={height}
          sx={{ display: 'inline-block', transform: 'none', width: '90px' }}
        />
      }
    </>
  );
}
