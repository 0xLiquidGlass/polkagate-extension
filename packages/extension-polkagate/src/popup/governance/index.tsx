// Copyright 2019-2023 @polkadot/extension-polkagate authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable react/jsx-max-props-per-line */

import '@vaadin/icons';

import { Breadcrumbs, Container, Grid, Link, Typography, useTheme } from '@mui/material';
import { CubeGrid, Wordpress } from 'better-react-spinkit';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useHistory, useLocation } from 'react-router-dom';

import { ActionContext, InputFilter } from '../../components';
import { useApi, useChainName, useDecidingCount, useFullscreen, useTracks, useTranslation } from '../../hooks';
import { getLatestReferendums, getTrackReferendums, Statistics } from './utils/helpers';
import { LatestReferenda, TopMenu } from './utils/types';
import { AllReferendaStats } from './AllReferendaStats';
import { Header } from './Header';
import { ReferendumSummary } from './ReferendumSummary';
import Toolbar from './Toolbar';
import { TrackStats } from './TrackStats';

export default function Governance(): React.ReactElement {
  const { t } = useTranslation();
  const { state } = useLocation();
  const history = useHistory();
  const theme = useTheme();
  const { address, postId } = useParams<{ address: string, postId?: string }>();

  useFullscreen();
  const api = useApi(address);
  const tracks = useTracks(address);
  const chainName = useChainName(address);
  const pageTrackRef = useRef({ page: 1, trackId: undefined, listFinished: false });
  const decidingCounts = useDecidingCount(address);
  const [selectedTopMenu, setSelectedTopMenu] = useState<TopMenu>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSubMenu, setSelectedSubMenu] = useState<string>(state?.selectedSubMenu || 'All');
  const [referendumCount, setReferendumCount] = useState<number | undefined>();
  const [referendumStats, setReferendumStats] = useState<Statistics | undefined>();
  const [referendaToList, setReferenda] = useState<LatestReferenda[] | null>();
  const [getMore, setGetMore] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>();

  const currentTrack = useMemo(() => tracks && tracks.find((t) => String(t[1].name) === selectedSubMenu.toLowerCase().replace(' ', '_')), [selectedSubMenu, tracks]);

  useEffect(() => {
    if (!api) {
      return;
    }

    if (!api.consts.referenda || !api.query.referenda) {
      console.log('OpenGov is not supported on this chain');

      return;
    }

    console.log('Maximum size of the referendum queue for a single track:', api.consts.referenda.maxQueued.toString());
    console.log('minimum amount to be used as a deposit :', api.consts.referenda.submissionDeposit.toString());
    console.log('blocks after submission that a referendum must begin decided by.', api.consts.referenda.undecidingTimeout.toString());

    api.query.referenda.referendumCount().then((count) => {
      console.log('total referendum count:', count.toNumber());
      setReferendumCount(count?.toNumber());
    }).catch(console.error);

    // const trackId_mediumSpender = 33;
    // api.query.referenda.trackQueue(trackId_mediumSpender).then((res) => {
    //   console.log('trackQueue for trackId_mediumSpender:', res.toString());
    // }).catch(console.error);
  }, [api]);

  useEffect(() => {
    if (chainName && selectedSubMenu === 'All') {
      setReferenda(undefined);
      // eslint-disable-next-line no-void
      void getLatestReferendums(chainName).then((res) => setReferenda(res));
    }
  }, [chainName, selectedSubMenu]);

  const getReferendaById = useCallback((postId: number) => {
    history.push({
      pathname: `/governance/${address}/${postId}`,
      state: { selectedSubMenu, selectedTopMenu }
    });
  }, [address, history, selectedSubMenu, selectedTopMenu]);

  useEffect(() => {
    if (chainName && selectedSubMenu && tracks?.length) {
      const trackId = tracks.find((t) => String(t[1].name) === selectedSubMenu.toLowerCase().replace(' ', '_'))?.[0] as number;
      let list = referendaToList;

      if (pageTrackRef.current.trackId !== trackId) {
        setReferenda(undefined);
        list = [];
        pageTrackRef.current.trackId = trackId; // Update the ref with new values
        pageTrackRef.current.page = 1;
        pageTrackRef.current.listFinished = false;
      }

      if (pageTrackRef.current.page > 1) {
        setIsLoading(true);
      }

      if (selectedSubMenu !== 'All') {
        trackId !== undefined && getTrackReferendums(chainName, pageTrackRef.current.page, trackId).then((res) => {
          setIsLoading(false);

          if (res === null) {
            if (pageTrackRef.current.page === 1) { // there is no referendum for this track
              setReferenda(null);

              return;
            }

            pageTrackRef.current.listFinished = true;

            return;
          }

          const concatenated = (list || []).concat(res);

          setReferenda([...concatenated]);
        }).catch(console.error);
      } else {
        getLatestReferendums(chainName, pageTrackRef.current.page * 30).then((res) => {
          setIsLoading(false);

          if (res === null) {
            if (pageTrackRef.current.page === 1) { // there is no referendum !!
              setReferenda(null);

              return;
            }

            pageTrackRef.current.listFinished = true;

            return;
          }

          setReferenda(res);
        }).catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainName, getMore, selectedSubMenu, tracks]);

  const backToTopMenu = useCallback((event) => {
    setSelectedSubMenu('All');
  }, []);

  const getMoreReferenda = useCallback(() => {
    pageTrackRef.current = { ...pageTrackRef.current, page: pageTrackRef.current.page + 1 };
    setGetMore(pageTrackRef.current.page);
  }, [pageTrackRef]);

  const SearchBar = () => (
    <Grid alignItems='center' container pt='15px'>
      <Grid item justifyContent='flex-start' xs>
        <InputFilter
          autoFocus={false}
          // onChange={onSearch}
          placeholder={t<string>('🔍 Search ')}
          theme={theme}
        // value={searchKeyword ?? ''}
        />
      </Grid>
      <Grid alignItems='center' container fontSize='16px' fontWeight={400} item py='10px' sx={{ cursor: 'pointer' }} xs={1} justifyContent='flex-start'
        // onClick={onFilters}
        pl='15px'>
        {t('Filters')}
        <Grid alignItems='center' container item justifyContent='center' pl='10px' sx={{ cursor: 'pointer', width: '40%' }}>
          <vaadin-icon icon='vaadin:ellipsis-dots-v' style={{ color: `${theme.palette.secondary.light}`, width: '33px' }} />
        </Grid>
      </Grid>
    </Grid>
  );

  const Bread = () => (
    <Grid container sx={{ py: '10px' }}>
      <Breadcrumbs aria-label='breadcrumb' color='text.primary'>
        <Link onClick={backToTopMenu} sx={{ cursor: 'pointer', fontWeight: 500 }} underline='hover'>
          {selectedTopMenu || 'Referenda'}
        </Link>
        <Typography color='text.primary' sx={{ fontWeight: 500 }}>
          {selectedSubMenu || 'All'}
        </Typography>
      </Breadcrumbs>
    </Grid>
  );

  const HorizontalWaiting = ({ color }: { color: string }) => (
    <div>
      <Wordpress color={color} timingFunction='linear' />
      <Wordpress color={color} timingFunction='ease' />
      <Wordpress color={color} timingFunction='ease-in' />
      <Wordpress color={color} timingFunction='ease-out' />
      <Wordpress color={color} timingFunction='ease-in-out' />
    </div>
  );

  return (
    <>
      <Header />
      <Toolbar
        address={address}
        decidingCounts={decidingCounts}
        menuOpen={menuOpen}
        selectedTopMenu={selectedTopMenu}
        setMenuOpen={setMenuOpen}
        setSelectedSubMenu={setSelectedSubMenu}
        setSelectedTopMenu={setSelectedTopMenu}
      />
      <Container disableGutters sx={{ maxWidth: 'inherit' }}>
        <Bread />
        <Container disableGutters sx={{ maxHeight: parent.innerHeight - 170, maxWidth: 'inherit', opacity: menuOpen ? 0.3 : 1, overflowY: 'scroll', position: 'fixed', top: 160 }}>
          {selectedSubMenu === 'All'
            ? <AllReferendaStats address={address} referendumStats={referendumStats} setReferendumStats={setReferendumStats} />
            : <TrackStats address={address} decidingCounts={decidingCounts} selectedSubMenu={selectedSubMenu} track={currentTrack} />
          }
          <SearchBar />
          {referendaToList
            ? <>
              {referendaToList.map((referendum, index) => {
                if (referendum?.post_id < (referendumCount || referendumStats?.OriginsCount)) {
                  return (
                    <ReferendumSummary address={address} key={index} onClick={() => getReferendaById(referendum.post_id)} referendum={referendum} />
                  );
                }
              })}
              {!pageTrackRef.current.listFinished &&
                <>
                  {
                    !isLoading
                      ? <Grid container item justifyContent='center' sx={{ pb: '15px', '&:hover': { cursor: 'pointer' } }}>
                        <Typography color='secondary.contrastText' fontSize='18px' fontWeight={600} onClick={getMoreReferenda}>
                          {t('Click to view more')}
                        </Typography>
                      </Grid>
                      : isLoading && <Grid container justifyContent='center'>
                        <HorizontalWaiting color={theme.palette.primary.main} />
                      </Grid>
                  }
                </>
              }
            </>
            : referendaToList === null
              ? <Grid container justifyContent='center' pt='10%'>
                <Typography color={'text.disabled'} fontSize={20} fontWeight={500}>
                  {t('No referenda in this track to display')}
                </Typography>
              </Grid>
              : <Grid container justifyContent='center' pt='10%'>
                <CubeGrid col={3} color={theme.palette.background.paper} row={3} size={200} />
              </Grid>
          }
        </Container>
      </Container>
    </>
  );
}
