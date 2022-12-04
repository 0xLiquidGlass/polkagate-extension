// Copyright 2019-2022 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AccountId } from '@polkadot/types/interfaces';

import { useCallback, useEffect, useState } from 'react';

import { DeriveAccountInfo } from '@polkadot/api-derive/types';

import { useChain, useEndpoint2 } from '.';

/**
 * @description
 * This hooks return a list of all available validators (current and waiting) on the chain which the address is already tied with.
 */

export default function useValidatorsIdentities(address: string, allValidatorsIds: AccountId[] | null | undefined): DeriveAccountInfo[] | null | undefined {
  const endpoint = useEndpoint2(address);
  const chain = useChain(address);
  const chainName = chain?.name?.replace(' Relay Chain', '')?.replace(' Network', '');
  const [validatorsIdentities, setValidatorsIdentities] = useState<DeriveAccountInfo[] | undefined>();
  const [newValidatorsIdentities, setNewValidatorsIdentities] = useState<DeriveAccountInfo[] | undefined>();

  const getValidatorsIdentities = useCallback((endpoint: string, validatorsAccountIds: AccountId[]) => {
    /** get validators identities */
    const getValidatorsIdWorker: Worker = new Worker(new URL('../util/workers/getValidatorsIdentities.js', import.meta.url));

    getValidatorsIdWorker.postMessage({ endpoint, validatorsAccountIds });

    getValidatorsIdWorker.onerror = (err) => {
      console.log(err);
    };

    getValidatorsIdWorker.onmessage = (e) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const fetchedIdentities: DeriveAccountInfo[] | null = e.data;

      console.log(`got ${fetchedIdentities?.length ?? ''} validators identities from ${chain?.name} `);

      /** if fetched differs from saved then setIdentities and save to local storage */
      if (fetchedIdentities?.length && JSON.stringify(validatorsIdentities) !== JSON.stringify(fetchedIdentities)) {
        console.log(`setting new identities #old was: ${validatorsIdentities?.length ?? ''} `);

        setNewValidatorsIdentities(fetchedIdentities);
        const keyItem = `${chainName}_validatorsIdentities`;

        chrome.storage.local.set({ keyItem: fetchedIdentities });
      }

      getValidatorsIdWorker.terminate();
    };
  }, [chain?.name, chainName, validatorsIdentities]);

  useEffect(() => {
    /** get validators info, including current and waiting, should be called after savedValidators gets value */
    endpoint && allValidatorsIds && !newValidatorsIdentities && getValidatorsIdentities(endpoint, allValidatorsIds);
  }, [endpoint, getValidatorsIdentities, allValidatorsIds, newValidatorsIdentities]);

  useEffect(() => {
    if (!chainName) {
      return;
    }

    // const localSavedValidatorsIdentities = chrome.storage.local.get(`${chainName}_validatorsIdentities`);

    // if (localSavedValidatorsIdentities) {
    //   const parsedLocalSavedValidatorsIdentities = JSON.parse(localSavedValidatorsIdentities) as DeriveAccountInfo[];

    //   setValidatorsIdentities(parsedLocalSavedValidatorsIdentities);
    // }

    chrome.storage.local.get(`${chainName}_validatorsIdentities`, (localSavedValidatorsIdentities) => {
      if (localSavedValidatorsIdentities) {
        console.log('localSavedValidatorsIdentities:', localSavedValidatorsIdentities);
        // const parsedLocalSavedValidatorsIdentities = JSON.parse(localSavedValidatorsIdentities) as DeriveAccountInfo[];

        // setValidatorsIdentities(parsedLocalSavedValidatorsIdentities);
      }
    });

    // chrome.storage.local.set({ key: value }).then(() => {
    //   console.log("Value is set to " + value);
    // });
    
    // chrome.storage.local.get(["key"]).then((result) => {
    //   console.log("Value currently is " + result.key);
    // });


  }, [chainName]);

  return newValidatorsIdentities ?? validatorsIdentities;
}
