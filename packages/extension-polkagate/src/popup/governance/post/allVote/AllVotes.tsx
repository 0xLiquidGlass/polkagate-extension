// Copyright 2019-2023 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import '@vaadin/icons';

import { Check as CheckIcon, Close as CloseIcon, RemoveCircle as AbstainIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Divider, Grid, Pagination, Tab, Tabs, Typography, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

import { BN } from '@polkadot/util';

import { Identity, Infotip2, InputFilter, Progress, ShowBalance } from '../../../../components';
import { useApi, useChain, useChainName, useDecimal, useToken, useTranslation } from '../../../../hooks';
import { DraggableModal } from '../../components/DraggableModal';
import { AbstainVoteType, AllVotesType, getAllVotesFromPA, getReferendumVotesFromSubscan, VoteType } from '../../utils/helpers';
import { getAddressVote } from '../myVote/util';
import Amount from './Amount';
import Delegators from './Delegators';

interface Props {
  address: string | undefined;
  isFellowship: boolean | undefined;
  open: boolean;
  setOpen: (value: React.SetStateAction<boolean>) => void
  refIndex: number | undefined;
  trackId: number | undefined;
  setOnChainVoteCounts: React.Dispatch<React.SetStateAction<{
    ayes: number | undefined;
    nays: number | undefined;
  } | undefined>>;
  setVoteCountsPA: React.Dispatch<React.SetStateAction<{
    ayes: number | undefined;
    nays: number | undefined;
  } | undefined>>;
}

const VOTE_PER_PAGE = 10;

export const VOTE_TYPE_MAP = {
  AYE: 1,
  NAY: 2,
  ABSTAIN: 3
};

export default function AllVotes({ address, isFellowship, open, refIndex, setOpen, setVoteCountsPA, trackId }: Props): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const chainName = useChainName(address);
  const chain = useChain(address);
  const decimal = useDecimal(address);
  const token = useToken(address);
  const api = useApi(address);

  const [tabIndex, setTabIndex] = useState<number>(1);
  const [allVotes, setAllVotes] = React.useState<AllVotesType | null>();
  const [NestedVotes, setNestedVotes] = React.useState<AllVotesType | null>();
  const [filteredVotes, setFilteredVotes] = React.useState<{ ayes: VoteType[], nays: VoteType[], abstains: AbstainVoteType[] } | null>();
  const [votesToShow, setVotesToShow] = React.useState<VoteType[] | AbstainVoteType[]>();
  const [page, setPage] = React.useState<number>(1);
  const [paginationCount, setPaginationCount] = React.useState<number>(10);
  const [amountSortType, setAmountSortType] = useState<'ASC' | 'DESC'>('ASC');
  const [isSearchBarOpen, setSearchBarOpen] = React.useState<boolean>(false);

  useEffect(() => {
    chainName && refIndex &&
      getReferendumVotesFromSubscan(chainName, refIndex).then((votes) => {
        // setAllVotes(votes);
        console.log('All votes from sb:', votes);
      });
  }, [chainName, refIndex]);

  // useEffect(() => {
  //   api && refIndex && trackId !== undefined &&
  //     getReferendumVotes(api, trackId, refIndex).then((votes) => {
  //       setAllVotes(votes);
  //       setAllVotes(votes);
  //       setOnChainVoteCounts({ ayes: votes?.ayes?.length, nays: votes?.nays?.length });
  //       setFilteredVotes(votes);
  //       console.log('All votes from chain:', votes);
  //     });
  // }, [api, refIndex, setOnChainVoteCounts, trackId]);

  useEffect(() => {
    chainName && refIndex && getAllVotesFromPA(chainName, refIndex, 100, isFellowship).then((res: AllVotesType | null) => {
      if (!res) {
        return setAllVotes(null);
      }

      const maxVote = Math.max(res.abstain.count, res.no.count, res.yes.count);

      getAllVotesFromPA(chainName, refIndex, maxVote, isFellowship).then((res: AllVotesType | null) => {
        if (!res) {
          return setAllVotes(null);
        }

        setAllVotes(res);
        setFilteredVotes({ abstains: res.abstain.votes, ayes: res.yes.votes, nays: res.no.votes });
        setVoteCountsPA({ ayes: res?.yes?.count, nays: res?.no?.count });
      }).catch(console.error);
    }).catch(console.error);
  }, [chainName, isFellowship, refIndex, setVoteCountsPA]);

  useEffect(() => {
    setNestedVotes(allVotes);
  }, [allVotes]);

  useEffect(() => {
    if (!allVotes || !api || !trackId || !refIndex) {
      return;
    }

    const keys = Object.keys(allVotes);

    keys.map((key) =>
      allVotes[key as keyof AllVotesType].votes.map((v) => {
        if (v.isDelegated) {
          getAddressVote(String(v.voter), api, Number(refIndex), Number(trackId)).then((delegatedVoteInfo) => {
            if (delegatedVoteInfo) {
              v.delegatee = delegatedVoteInfo.delegating?.target;
              setNestedVotes({ ...allVotes });
            }
          }).catch(console.error);
        }

        return v;
      })
    );
  }, [allVotes, api, refIndex, trackId]);

  console.log(' allVotes.abstain:', allVotes?.abstain);

  useEffect(() => {
    if (filteredVotes) {
      let votesBasedOnType = filteredVotes.ayes;

      if (tabIndex === VOTE_TYPE_MAP.NAY) {
        votesBasedOnType = filteredVotes.nays;
      } else if (tabIndex === VOTE_TYPE_MAP.ABSTAIN) {
        votesBasedOnType = filteredVotes.abstains;
      }

      // filter to just show standards, and delegated as nested
      votesBasedOnType = votesBasedOnType.filter((v) => !v.isDelegated);

      setVotesToShow(votesBasedOnType.slice((page - 1) * VOTE_PER_PAGE, page * VOTE_PER_PAGE));
      setPaginationCount(Math.ceil(votesBasedOnType.length / VOTE_PER_PAGE));
    }
  }, [filteredVotes, page, tabIndex]);

  const handleClose = useCallback(() => {
    NestedVotes && setFilteredVotes({ abstains: NestedVotes.abstain.votes, ayes: NestedVotes.yes.votes, nays: NestedVotes.no.votes });
    setOpen(false);
  }, [NestedVotes, setOpen]);

  const handleTabChange = useCallback((event: React.SyntheticEvent<Element, Event>, tabIndex: number) => {
    setTabIndex(tabIndex);
    setPage(1);
  }, []);

  const onSortAmount = useCallback(() => {
    setPage(1);
    setAmountSortType((prev) => prev === 'ASC' ? 'DESC' : 'ASC');

    if (tabIndex === VOTE_TYPE_MAP.ABSTAIN) {
      votesToShow?.sort((a, b) => amountSortType === 'ASC'
        ? (new BN(a.balance.abstain).sub(new BN(b.balance.abstain))).isNeg() ? -1 : 1
        : (new BN(b.balance.abstain).sub(new BN(a.balance.abstain))).isNeg() ? -1 : 1
      );

      return;
    }

    votesToShow?.sort((a, b) => amountSortType === 'ASC'
      ? (new BN(a.balance.value).sub(new BN(b.balance.value))).isNeg() ? -1 : 1
      : (new BN(b.balance.value).sub(new BN(a.balance.value))).isNeg() ? -1 : 1
    );
  }, [amountSortType, tabIndex, votesToShow]);

  const onPageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setPage(page);
  }, []);

  const onSearch = useCallback((filter: string) => {
    NestedVotes && setFilteredVotes(
      {
        abstains: NestedVotes.abstain.votes.filter((c) => c.voter.includes(filter)),
        ayes: NestedVotes.yes.votes.filter((a) => a.voter.includes(filter)),
        nays: NestedVotes.no.votes.filter((b) => b.voter.includes(filter))
      }
    );
  }, [NestedVotes]);

  const openSearchBar = useCallback(() => {
    !isSearchBarOpen && setSearchBarOpen(true);
  }, [isSearchBarOpen]);

  return (
    <DraggableModal onClose={handleClose} open={open} width={762}>
      <>
        <Grid alignItems='center' container>
          <Grid item>
            <Typography fontSize='22px' fontWeight={700}>
              {t('All Votes')}
            </Typography>
          </Grid>
          <Grid item>
            <Divider orientation='vertical' sx={{ bgcolor: 'text.primary', opacity: 0.3, height: '30px', mx: '5px', width: '2px' }} />
          </Grid>
          <Grid item onClick={openSearchBar} sx={{ cursor: 'pointer', px: '10px', textAlign: 'start' }} xs>
            {isSearchBarOpen
              ? <InputFilter
                autoFocus={false}
                onChange={onSearch}
                placeholder={t<string>('🔍 Search voter')}
                theme={theme}
              // value={searchKeyword ?? ''}
              />
              : <SearchIcon sx={{ color: 'rgba(0,0,0,0.2)', fontSize: '30px', width: 'fit-content' }} />
            }
          </Grid>
          <Grid item>
            <CloseIcon onClick={handleClose} sx={{ color: 'primary.main', cursor: 'pointer', stroke: theme.palette.primary.main, strokeWidth: 1.5 }} />
          </Grid>
        </Grid>
        <Box>
          <Tabs centered onChange={handleTabChange} sx={{ pt: '15px', 'span.MuiTabs-indicator': { bgcolor: 'secondary.light', height: '5px', width: '100%' } }} value={tabIndex}>
            <Tab
              icon={<CheckIcon sx={{ color: 'success.main' }} />}
              iconPosition='start'
              label={t<string>('Ayes ({{ayesCount}})', { replace: { ayesCount: filteredVotes?.ayes?.length || 0 } })}
              sx={{
                ':is(button.MuiButtonBase-root.MuiTab-root)': {
                  height: '49px',
                  minHeight: '49px'
                },
                ':is(button.MuiButtonBase-root.MuiTab-root.Mui-selected)': {
                  bgcolor: '#fff',
                  color: 'secondary.light',
                  fontWeight: 500
                },
                borderBlock: '5px solid',
                borderBlockColor: 'rgba(0,0,0,0.2)',
                color: 'text.primary',
                fontSize: '18px',
                fontWeight: 400,
                minWidth: '108px',
                textTransform: 'capitalize',
                width: '33%'
              }}
              value={1}
            />
            <Tab disabled icon={<Divider orientation='vertical' sx={{ backgroundColor: 'rgba(0,0,0,0.2)', height: '25px', mx: '5px', my: 'auto', width: '2px' }} />} label='' sx={{ borderBlock: '5px solid', borderBlockColor: 'rgba(0,0,0,0.2)', minWidth: '2px', p: '0', width: '2px' }} value={4} />
            <Tab
              icon={<CloseIcon sx={{ color: 'warning.main' }} />}
              iconPosition='start'
              label={t<string>('Nays ({{naysCount}})', { replace: { naysCount: filteredVotes?.nays?.length || 0 } })}
              sx={{
                ':is(button.MuiButtonBase-root.MuiTab-root)': {
                  height: '49px',
                  minHeight: '49px'
                },
                ':is(button.MuiButtonBase-root.MuiTab-root.Mui-selected)': {
                  bgcolor: '#fff',
                  color: 'secondary.light',
                  fontWeight: 500
                },
                borderBlock: '5px solid',
                borderBlockColor: 'rgba(0,0,0,0.2)',
                color: 'text.primary',
                fontSize: '18px',
                fontWeight: 400,
                minWidth: '108px',
                textTransform: 'capitalize',
                width: '33%'
              }}
              value={2}
            />
            <Tab disabled icon={<Divider orientation='vertical' sx={{ backgroundColor: 'rgba(0,0,0,0.2)', height: '25px', mx: '5px', my: 'auto', width: '2px' }} />} label='' sx={{ borderBlock: '5px solid', borderBlockColor: 'rgba(0,0,0,0.2)', minWidth: '2px', p: '0', width: '2px' }} value={4} />
            <Tab
              icon={<AbstainIcon sx={{ color: 'primary.light' }} />}
              iconPosition='start'
              label={t<string>('Abstain ({{abstainsCount}})', { replace: { abstainsCount: filteredVotes?.abstains?.length || 0 } })}
              sx={{
                ':is(button.MuiButtonBase-root.MuiTab-root)': {
                  height: '49px',
                  minHeight: '49px'
                },
                ':is(button.MuiButtonBase-root.MuiTab-root.Mui-selected)': {
                  bgcolor: '#fff',
                  color: 'secondary.light',
                  fontWeight: 500
                },
                borderBlock: '5px solid',
                borderBlockColor: 'rgba(0,0,0,0.2)',
                color: 'text.primary',
                fontSize: '18px',
                fontWeight: 400,
                minWidth: '108px',
                textTransform: 'capitalize',
                width: '33%'
              }}
              value={3}
            />
          </Tabs>
        </Box>
        <Grid alignContent='flex-start' alignItems='flex-start' container justifyContent='center' sx={{ mt: '20px', position: 'relative', height: '460px' }}>
          <Grid container id='table header' justifyContent='space-around' sx={{ borderBottom: 2, borderColor: 'primary.light', mb: '10px', fontSize: '20px', fontWeight: 400 }}>
            <Grid item width='38%'>
              {t('Voter')}
            </Grid>
            <Grid item width='22%'>
              <vaadin-icon icon='vaadin:sort' onClick={onSortAmount} style={{ height: '20px', color: `${theme.palette.primary.main}`, cursor: 'pointer' }} />
              {t('Vote')}
            </Grid>
            <Grid item width='15%'>
              {t('Delegators')}
            </Grid>
            <Grid alignItems='center' container item justifyContent='center' width='12%'>
              <Infotip2 iconTop={7} showQuestionMark text={t('Delegated: representatives vote on behalf of token holders, Standard: token holders vote directly')}>
                <Typography fontSize='20px' width='fit-content'>
                  {t('>')}
                </Typography>
              </Infotip2>
            </Grid>
          </Grid>
          {votesToShow?.map((vote, index) => (
            <Grid alignItems='flex-start' container justifyContent='space-around' key={index} sx={{ borderBottom: 0.5, borderColor: 'secondary.contrastText', fontSize: '16px', fontWeight: 400, py: '5px' }}>
              <Grid container item justifyContent='flex-start' width='38%'>
                <Identity
                  api={api}
                  chain={chain}
                  formatted={vote.voter}
                  identiconSize={28}
                  showShortAddress
                  showSocial={false}
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    maxWidth: '100%',
                    minWidth: '35%',
                    width: 'fit-content'
                  }}
                />
              </Grid>
              <Grid container item justifyContent='center' width='22%'>
                <Amount
                  address={address}
                  allVotes={NestedVotes}
                  vote={vote}
                  voteType={tabIndex}
                />
              </Grid>
              <Grid item width='15%'>
                <Delegators
                  address={address}
                  allVotes={NestedVotes}
                  vote={vote}
                  voteType={tabIndex}
                />
              </Grid>
              <Grid item sx={{ textAlign: 'right' }} width='12%'>
                {vote?.isDelegated ? t('Delegated') : t('Standard')}
              </Grid>
            </Grid>
          ))
          }
          {votesToShow &&
            <Pagination
              count={paginationCount}
              onChange={onPageChange}
              page={page}
              sx={{ bottom: '-18px', position: 'absolute' }}
            />
          }
          {!allVotes &&
            <Progress
              fontSize={16}
              pt={10}
              size={150}
              title={t('Loading votes ...')}
            />}
        </Grid>
      </>
    </DraggableModal>
  );
}
