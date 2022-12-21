// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useState } from 'react';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { AccountId } from '@polkadot/types/interfaces/runtime';

import { APIContext } from '../components';
import { useChain, useEndpoint2 } from '.';

export default function useApi(address: AccountId | string | undefined, stateApi?: ApiPromise): ApiPromise | undefined {
  const endpoint = useEndpoint2(address);
  const apisContext = useContext(APIContext);
  const chain = useChain(address);

  const [api, setApi] = useState<ApiPromise | undefined>();

  useEffect(() => {
    if (chain?.genesisHash && apisContext?.apis[chain.genesisHash]) {
      return setApi(apisContext?.apis[chain.genesisHash].api);
    }

    if (!endpoint) {
      return;
    }

    if (stateApi) {
      return setApi(stateApi);
    }

    const wsProvider = new WsProvider(endpoint);

    ApiPromise.create({ provider: wsProvider }).then((api) => {
      setApi(api);

      apisContext.apis[String(api.genesisHash.toHex())] = { api, apiEndpoint: endpoint };
      apisContext.setIt(apisContext.apis);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apisContext?.apis?.length, endpoint, stateApi, chain]);

  return api;
}
