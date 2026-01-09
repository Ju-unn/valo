'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Trophy,
  DollarSign,
  Gavel,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AUCTION_STATE_KEY = 'auction-state';

// 타입 정의
interface Player {
  name: string;
  tier: string;
  agents?: string[];
  comment?: string;
  sold: boolean;
  price: number;
  team: string | null;
}

interface Team {
  name: string;
  budget: number;
  players: Player[];
}

interface CustomBidAmount {
  [key: string]: string;
}

export default function ValorantAuction() {
  const [phase, setPhase] = useState<string>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [bidder, setBidder] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerTier, setNewPlayerTier] = useState<string>('');
  const [newPlayerAgent1, setNewPlayerAgent1] = useState<string>('');
  const [newPlayerAgent2, setNewPlayerAgent2] = useState<string>('');
  const [newPlayerAgent3, setNewPlayerAgent3] = useState<string>('');
  const [newPlayerComment, setNewPlayerComment] = useState<string>('');
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [budgetPerTeam, setBudgetPerTeam] = useState<number | string>('');
  const [customBidAmount, setCustomBidAmount] = useState<CustomBidAmount>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [lastBidTime, setLastBidTime] = useState<number | null>(null);
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>([]);
  const [isResale, setIsResale] = useState<boolean>(false);

  // 🔍 디버깅용 상태 추가
  const [realtimeStatus, setRealtimeStatus] = useState<string>('연결 중...');
  const [lastUpdate, setLastUpdate] = useState<string>('없음');

  // Supabase에서 데이터 로드
  const loadData = useCallback(async () => {
    try {
      console.log('📥 데이터 로드 시도...');
      const { data, error } = await supabase
        .from('auction_state')
        .select('*')
        .eq('key', AUCTION_STATE_KEY)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ 데이터 로드 에러:', error);
        return;
      }

      if (data && data.value) {
        console.log('✅ 데이터 로드 성공:', data.value);
        const parsedData =
          typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

        console.log('📊 현재 phase:', parsedData.phase);

        setPhase(parsedData.phase || 'setup');
        setPlayers(parsedData.players || []);
        setTeams(parsedData.teams || []);
        setCurrentPlayerIndex(parsedData.currentPlayerIndex || 0);
        setCurrentBid(parsedData.currentBid || 0);
        setBidder(parsedData.bidder || '');
        setBudgetPerTeam(parsedData.budgetPerTeam || 1000);
        setLastBidTime(parsedData.lastBidTime || null);
        setTimerActive(parsedData.timerActive || false);
        setUnsoldPlayers(parsedData.unsoldPlayers || []);
        setIsResale(parsedData.isResale || false);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.log('⚠️ 첫 실행 또는 데이터 없음:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase에 데이터 저장
  const saveData = useCallback(
    async (updatedData: any) => {
      try {
        const data = {
          phase: updatedData.phase !== undefined ? updatedData.phase : phase,
          players:
            updatedData.players !== undefined ? updatedData.players : players,
          teams: updatedData.teams !== undefined ? updatedData.teams : teams,
          currentPlayerIndex:
            updatedData.currentPlayerIndex !== undefined
              ? updatedData.currentPlayerIndex
              : currentPlayerIndex,
          currentBid:
            updatedData.currentBid !== undefined
              ? updatedData.currentBid
              : currentBid,
          bidder:
            updatedData.bidder !== undefined ? updatedData.bidder : bidder,
          budgetPerTeam:
            updatedData.budgetPerTeam !== undefined
              ? updatedData.budgetPerTeam
              : budgetPerTeam,
          lastBidTime:
            updatedData.lastBidTime !== undefined
              ? updatedData.lastBidTime
              : lastBidTime,
          timerActive:
            updatedData.timerActive !== undefined
              ? updatedData.timerActive
              : timerActive,
          unsoldPlayers:
            updatedData.unsoldPlayers !== undefined
              ? updatedData.unsoldPlayers
              : unsoldPlayers,
          isResale:
            updatedData.isResale !== undefined
              ? updatedData.isResale
              : isResale,
        };

        console.log('💾 데이터 저장 시도:', data);

        const { error } = await supabase.from('auction_state').upsert(
          {
            key: AUCTION_STATE_KEY,
            value: data,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          }
        );

        if (error) {
          console.error('❌ 저장 실패:', error);
        } else {
          console.log('✅ 저장 성공!');
        }
      } catch (error) {
        console.error('❌ 저장 실패:', error);
      }
    },
    [
      phase,
      players,
      teams,
      currentPlayerIndex,
      currentBid,
      bidder,
      budgetPerTeam,
      lastBidTime,
      timerActive,
      unsoldPlayers,
      isResale,
    ]
  );

  // 초기 로드 및 Realtime 구독
  useEffect(() => {
    loadData();

    console.log('🔌 Realtime 구독 시작...');

    // 🎯 Realtime 구독 설정 - 모든 사용자가 동일한 화면을 보도록 자동 동기화
    const channel = supabase
      .channel('auction-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_state',
          filter: `key=eq.${AUCTION_STATE_KEY}`,
        },
        (payload) => {
          console.log('🔔 Realtime 이벤트 수신:', payload);

          const newRecord = payload.new as { value?: any } | null;
          if (newRecord && newRecord.value) {
            const parsedData =
              typeof newRecord.value === 'string'
                ? JSON.parse(newRecord.value)
                : newRecord.value;

            console.log('🚀 Phase 변경 감지:', parsedData.phase);

            // 🚀 phase가 'auction'으로 변경되면 모든 접속자의 화면이 자동으로 경매 페이지로 전환됨
            setPhase(parsedData.phase || 'setup');
            setPlayers(parsedData.players || []);
            setTeams(parsedData.teams || []);
            setCurrentPlayerIndex(parsedData.currentPlayerIndex || 0);
            setCurrentBid(parsedData.currentBid || 0);
            setBidder(parsedData.bidder || '');
            setBudgetPerTeam(parsedData.budgetPerTeam || 1000);
            setLastBidTime(parsedData.lastBidTime || null);
            setTimerActive(parsedData.timerActive || false);
            setUnsoldPlayers(parsedData.unsoldPlayers || []);
            setIsResale(parsedData.isResale || false);
            setLastUpdate(new Date().toLocaleTimeString());
            setRealtimeStatus('✅ 연결됨');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime 상태:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('✅ 연결됨');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('❌ 연결 실패');
        } else if (status === 'TIMED_OUT') {
          setRealtimeStatus('⏱️ 타임아웃');
        } else {
          setRealtimeStatus(`🔄 ${status}`);
        }
      });

    return () => {
      console.log('🔌 Realtime 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // 자동 새로고침 (Realtime으로 대체되었지만 호환성을 위해 유지)
  useEffect(() => {
    if (!autoRefresh || phase !== 'auction') return;

    const interval = setInterval(() => {
      loadData();
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, phase, loadData]);

  // 타이머 관리
  useEffect(() => {
    if (!timerActive || !lastBidTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastBidTime) / 1000);
      const remaining = 15 - elapsed;

      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleAutoSell();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, lastBidTime]);

  // 자동 낙찰/유찰
  const handleAutoSell = async () => {
    if (bidder) {
      await sellPlayer();
    } else {
      await markAsUnsold();
    }
  };

  // 팀 추가
  const addTeam = async () => {
    if (newTeamName.trim()) {
      const budget = budgetPerTeam === '' ? 1000 : Number(budgetPerTeam);
      const updatedTeams: Team[] = [
        ...teams,
        {
          name: newTeamName,
          budget: budget,
          players: [],
        },
      ];
      setTeams(updatedTeams);
      await saveData({ teams: updatedTeams });
      setNewTeamName('');
    }
  };

  // 팀 삭제
  const removeTeam = async (index: number) => {
    const updatedTeams = teams.filter((_, idx) => idx !== index);
    setTeams(updatedTeams);
    await saveData({ teams: updatedTeams });
  };

  // 선수 추가
  const addPlayer = async () => {
    if (newPlayerName.trim() && newPlayerTier.trim()) {
      const updatedPlayers: Player[] = [
        ...players,
        {
          name: newPlayerName,
          tier: newPlayerTier,
          agents: [newPlayerAgent1, newPlayerAgent2, newPlayerAgent3].filter(
            (a) => a.trim()
          ),
          comment: newPlayerComment,
          sold: false,
          price: 0,
          team: null,
        },
      ];
      setPlayers(updatedPlayers);
      await saveData({ players: updatedPlayers });
      setNewPlayerName('');
      setNewPlayerTier('');
      setNewPlayerAgent1('');
      setNewPlayerAgent2('');
      setNewPlayerAgent3('');
      setNewPlayerComment('');
    }
  };

  // 선수 삭제
  const removePlayer = async (index: number) => {
    const updatedPlayers = players.filter((_, idx) => idx !== index);
    setPlayers(updatedPlayers);
    await saveData({ players: updatedPlayers });
  };

  // 선수 순서 변경
  const movePlayer = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= players.length) return;

    const updatedPlayers = [...players];
    [updatedPlayers[index], updatedPlayers[newIndex]] = [
      updatedPlayers[newIndex],
      updatedPlayers[index],
    ];
    setPlayers(updatedPlayers);
    await saveData({ players: updatedPlayers });
  };

  // 경매 시작 (🎯 모든 접속자의 화면이 자동으로 경매 페이지로 전환됨)
  const startAuction = async () => {
    if (teams.length === 0 || players.length === 0) {
      alert('최소 1개의 팀과 선수가 필요합니다.');
      return;
    }

    console.log('🚀 경매 시작 버튼 클릭!');

    // 로컬 상태 업데이트
    setPhase('auction');
    setCurrentBid(0);
    setTimerActive(false);
    setLastBidTime(null);

    // 🚀 Supabase에 저장 → Realtime 구독으로 모든 사용자에게 즉시 전파
    await saveData({
      phase: 'auction',
      currentBid: 0,
      timerActive: false,
      lastBidTime: null,
    });

    console.log('✅ 경매 시작 데이터 저장 완료');
  };

  // 선수별 경매 시작
  const startPlayerAuction = async () => {
    const now = Date.now();
    setTimerActive(true);
    setLastBidTime(now);
    setTimeLeft(15);
    await saveData({
      timerActive: true,
      lastBidTime: now,
    });
  };

  // 입찰
  const placeBid = async (teamName: string, amount: number) => {
    if (!timerActive) return;

    const team = teams.find((t) => t.name === teamName);
    if (team && team.budget >= amount && amount > currentBid) {
      const now = Date.now();
      setCurrentBid(amount);
      setBidder(teamName);
      setLastBidTime(now);
      setTimerActive(true);
      setTimeLeft(15);
      await saveData({
        currentBid: amount,
        bidder: teamName,
        lastBidTime: now,
        timerActive: true,
      });
    }
  };

  // 커스텀 입찰
  const placeCustomBid = async (teamName: string) => {
    const amount = customBidAmount[teamName];
    if (amount) {
      await placeBid(teamName, Number(amount));
      setCustomBidAmount({ ...customBidAmount, [team.name]: '' });
    }
  };

  // 낙찰
  const sellPlayer = async () => {
    if (bidder && currentPlayerIndex < players.length) {
      const updatedPlayers = [...players];
      const soldPlayer: Player = {
        ...updatedPlayers[currentPlayerIndex],
        sold: true,
        price: currentBid,
        team: bidder,
      };
      updatedPlayers[currentPlayerIndex] = soldPlayer;

      const updatedTeams = teams.map((team) => {
        if (team.name === bidder) {
          return {
            ...team,
            budget: team.budget - currentBid,
            players: [...team.players, soldPlayer],
          };
        }
        return team;
      });

      setPlayers(updatedPlayers);
      setTeams(updatedTeams);
      setTimerActive(false);
      setLastBidTime(null);

      await moveToNextPlayer(updatedPlayers, updatedTeams);
    }
  };

  // 유찰 처리
  const markAsUnsold = async () => {
    if (currentPlayerIndex < players.length) {
      const currentP = players[currentPlayerIndex];
      const updatedUnsold = [...unsoldPlayers, currentP];

      setUnsoldPlayers(updatedUnsold);
      setTimerActive(false);
      setLastBidTime(null);

      await moveToNextPlayer(players, teams, updatedUnsold);
    }
  };

  // 다음 선수로 이동
  const moveToNextPlayer = async (
    updatedPlayers: Player[],
    updatedTeams: Team[],
    updatedUnsold: Player[] = unsoldPlayers
  ) => {
    if (currentPlayerIndex < players.length - 1) {
      const newIndex = currentPlayerIndex + 1;
      setCurrentPlayerIndex(newIndex);
      setCurrentBid(0);
      setBidder('');
      setTimeLeft(15);
      setPlayers(updatedPlayers);
      setTeams(updatedTeams);
      setUnsoldPlayers(updatedUnsold);
      await saveData({
        players: updatedPlayers,
        teams: updatedTeams,
        currentPlayerIndex: newIndex,
        currentBid: 0,
        bidder: '',
        timerActive: false,
        lastBidTime: null,
        unsoldPlayers: updatedUnsold,
      });
    } else {
      if (updatedUnsold.length > 0 && !isResale) {
        await startResale(updatedPlayers, updatedTeams, updatedUnsold);
      } else {
        setPhase('complete');
        setPlayers(updatedPlayers);
        setTeams(updatedTeams);
        setUnsoldPlayers(updatedUnsold);
        await saveData({
          players: updatedPlayers,
          teams: updatedTeams,
          phase: 'complete',
          unsoldPlayers: updatedUnsold,
        });
      }
    }
  };

  // 재경매 시작
  const startResale = async (
    updatedPlayers: Player[],
    updatedTeams: Team[],
    updatedUnsold: Player[]
  ) => {
    setPlayers(updatedUnsold);
    setTeams(updatedTeams);
    setCurrentPlayerIndex(0);
    setCurrentBid(0);
    setBidder('');
    setTimerActive(false);
    setLastBidTime(null);
    setIsResale(true);
    setUnsoldPlayers([]);
    await saveData({
      players: updatedUnsold,
      teams: updatedTeams,
      currentPlayerIndex: 0,
      currentBid: 0,
      bidder: '',
      timerActive: false,
      lastBidTime: null,
      isResale: true,
      unsoldPlayers: [],
    });
  };

  // 초기화
  const resetAuction = async () => {
    setPhase('setup');
    setPlayers([]);
    setTeams([]);
    setCurrentPlayerIndex(0);
    setCurrentBid(0);
    setBidder('');
    setTimerActive(false);
    setLastBidTime(null);
    setUnsoldPlayers([]);
    setIsResale(false);
    await saveData({
      phase: 'setup',
      players: [],
      teams: [],
      currentPlayerIndex: 0,
      currentBid: 0,
      bidder: '',
      timerActive: false,
      lastBidTime: null,
      unsoldPlayers: [],
      isResale: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-2xl">로딩 중...</div>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-400" size={48} />
            발로란트 팀 경매
          </h1>
          <p className="text-gray-400">실시간 멀티플레이어 경매 시스템</p>

          {/* 🔍 디버깅 정보 표시 */}
          <div className="mt-3 bg-gray-800 rounded-lg p-3 inline-block">
            <div className="flex items-center gap-3 text-sm">
              {realtimeStatus.includes('✅') ? (
                <Wifi className="text-green-400" size={16} />
              ) : (
                <WifiOff className="text-red-400" size={16} />
              )}
              <span>{realtimeStatus}</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">
                마지막 업데이트: {lastUpdate}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-yellow-400">현재 Phase: {phase}</span>
            </div>
          </div>

          {/* 자동 새로고침 토글 */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <RefreshCw
                size={16}
                className={autoRefresh ? 'animate-spin' : ''}
              />
              {autoRefresh ? '🟢 실시간 동기화 ON' : '🔴 실시간 동기화 OFF'}
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              수동 새로고침
            </button>
            {phase !== 'setup' && (
              <button
                onClick={resetAuction}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} />
                초기화
              </button>
            )}
          </div>

          {/* 실시간 동기화 안내 */}
          {autoRefresh && realtimeStatus.includes('✅') && (
            <div className="mt-3 text-sm text-green-400 animate-pulse">
              ✨ 모든 사용자가 같은 화면을 실시간으로 보고 있습니다
            </div>
          )}
        </div>

        {/* 설정 단계 */}
        {phase === 'setup' && (
          <div className="space-y-6">
            <div className="bg-yellow-900 border-2 border-yellow-600 rounded-lg p-4 text-center">
              <p className="font-bold text-lg mb-2">
                💡 여러 명이 함께 사용하세요!
              </p>
              <p className="text-sm mt-2">
                이 페이지 URL을 친구들과 공유하면 실시간으로 함께 경매에 참여할
                수 있습니다.
              </p>
              <p className="text-sm mt-2 text-yellow-300">
                🎯 경매 진행자가 "경매 시작" 버튼을 누르면,{' '}
                <strong>
                  모든 접속자의 화면이 자동으로 경매 페이지로 전환
                </strong>
                됩니다!
              </p>
            </div>

            {/* 예산 설정 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-400" />
                팀당 예산 설정
              </h2>
              <input
                type="text"
                value={budgetPerTeam}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setBudgetPerTeam(value === '' ? '' : Number(value));
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                placeholder="팀당 예산 (예: 1000)"
              />
            </div>

            {/* 팀 추가 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Users className="text-blue-400" />팀 등록
              </h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTeam()}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="팀 이름"
                />
                <button
                  onClick={addTeam}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded flex items-center gap-2"
                >
                  <Plus size={20} />
                  추가
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teams.map((team, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700 p-3 rounded flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold">{team.name}</span>
                      <span className="text-green-400 ml-3">
                        {team.budget.toLocaleString()}원
                      </span>
                    </div>
                    <button
                      onClick={() => removeTeam(idx)}
                      className="bg-red-600 hover:bg-red-700 p-2 rounded"
                      title="팀 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 선수 추가 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-400" />
                선수 등록
              </h2>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                    placeholder="선수 이름"
                  />
                  <input
                    type="text"
                    value={newPlayerTier}
                    onChange={(e) => setNewPlayerTier(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                    placeholder="티어 (예: 다이아)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newPlayerAgent1}
                    onChange={(e) => setNewPlayerAgent1(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                    placeholder="잘하는 요원 1"
                  />
                  <input
                    type="text"
                    value={newPlayerAgent2}
                    onChange={(e) => setNewPlayerAgent2(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                    placeholder="잘하는 요원 2"
                  />
                  <input
                    type="text"
                    value={newPlayerAgent3}
                    onChange={(e) => setNewPlayerAgent3(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                    placeholder="잘하는 요원 3"
                  />
                </div>
                <textarea
                  value={newPlayerComment}
                  onChange={(e) => setNewPlayerComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addPlayer();
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white resize-none"
                  placeholder="각오 한마디"
                  rows={2}
                />
                <button
                  onClick={addPlayer}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded flex items-center justify-center gap-2 font-bold"
                >
                  <Plus size={20} />
                  선수 추가
                </button>
              </div>
              <div className="space-y-3">
                {players.map((player, idx) => (
                  <div key={idx} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">{idx + 1}.</span>
                          <span className="font-bold text-lg">
                            {player.name}
                          </span>
                          <span className="text-sm bg-blue-600 px-2 py-1 rounded">
                            {player.tier}
                          </span>
                        </div>
                        {player.agents && player.agents.length > 0 && (
                          <div className="text-sm text-gray-300 mb-1">
                            <span className="text-gray-400">잘하는 요원:</span>{' '}
                            {player.agents.join(', ')}
                          </div>
                        )}
                        {player.comment && (
                          <div className="text-sm text-gray-300 italic">
                            &quot;{player.comment}&quot;
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-3">
                        <button
                          onClick={() => movePlayer(idx, 'up')}
                          disabled={idx === 0}
                          className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed p-2 rounded"
                          title="위로"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePlayer(idx, 'down')}
                          disabled={idx === players.length - 1}
                          className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed p-2 rounded"
                          title="아래로"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removePlayer(idx)}
                          className="bg-red-600 hover:bg-red-700 p-2 rounded"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startAuction}
              disabled={teams.length === 0 || players.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-4 rounded-lg text-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-105"
            >
              <Gavel size={24} />
              🚀 경매 시작 (모든 사용자 화면 전환)
            </button>
            {teams.length > 0 && players.length > 0 && (
              <p className="text-center text-sm text-gray-400 -mt-4">
                버튼을 누르면 이 URL에 접속한{' '}
                <strong>모든 사람의 화면이 경매 페이지로 자동 전환</strong>
                됩니다
              </p>
            )}
          </div>
        )}

        {/* 경매 진행 단계 */}
        {phase === 'auction' && currentPlayer && (
          <div className="space-y-6">
            {isResale && (
              <div className="bg-orange-900 border-2 border-orange-600 rounded-lg p-4 text-center">
                <p className="font-bold text-xl">🔄 재경매 진행 중</p>
                <p className="text-sm mt-2">유찰된 선수들을 다시 경매합니다</p>
              </div>
            )}

            {/* 현재 선수 정보 */}
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-8 text-center">
              <div className="text-sm text-gray-300 mb-2">경매 중인 선수</div>
              <h2 className="text-4xl font-bold mb-2">{currentPlayer.name}</h2>
              <div className="text-xl text-yellow-300 mb-3">
                {currentPlayer.tier}
              </div>
              {currentPlayer.agents && currentPlayer.agents.length > 0 && (
                <div className="text-lg text-gray-200 mb-2">
                  🎯 {currentPlayer.agents.join(' • ')}
                </div>
              )}
              {currentPlayer.comment && (
                <div className="text-base text-gray-300 italic mt-3 bg-black bg-opacity-30 py-2 px-4 rounded">
                  &quot;{currentPlayer.comment}&quot;
                </div>
              )}
            </div>

            {/* 타이머 */}
            {timerActive ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Clock
                    className={
                      timeLeft <= 5
                        ? 'text-red-400 animate-pulse'
                        : 'text-blue-400'
                    }
                    size={32}
                  />
                  <div
                    className={`text-6xl font-bold ${
                      timeLeft <= 5
                        ? 'text-red-400 animate-pulse'
                        : 'text-blue-400'
                    }`}
                  >
                    {timeLeft}초
                  </div>
                </div>
                <div className="text-sm text-gray-400">입찰 마감까지</div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <button
                  onClick={startPlayerAuction}
                  className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg text-2xl font-bold flex items-center justify-center gap-3 mx-auto"
                >
                  <Gavel size={32} />
                  경매 시작
                </button>
                <div className="text-sm text-gray-400 mt-3">
                  버튼을 눌러 경매를 시작하세요
                </div>
              </div>
            )}

            {/* 현재 입찰 정보 */}
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">현재 입찰가</div>
              <div className="text-5xl font-bold text-green-400 mb-2">
                {currentBid === 0
                  ? '입찰 전'
                  : `${currentBid.toLocaleString()}원`}
              </div>
              {bidder ? (
                <div className="text-xl text-blue-300">
                  최고 입찰자: {bidder}
                </div>
              ) : (
                <div className="text-xl text-gray-500">
                  {timerActive
                    ? '입찰을 기다리는 중...'
                    : '경매 시작 버튼을 눌러주세요'}
                </div>
              )}
            </div>

            {/* 팀별 입찰 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-4">
                  <div className="font-bold text-lg mb-2">{team.name}</div>
                  <div className="text-sm text-gray-400 mb-3">
                    남은 예산: {team.budget.toLocaleString()}원
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => placeBid(team.name, 100)}
                      disabled={
                        !timerActive || team.budget < 100 || 100 <= currentBid
                      }
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded text-sm"
                    >
                      100원
                    </button>
                    <button
                      onClick={() => placeBid(team.name, 500)}
                      disabled={
                        !timerActive || team.budget < 500 || 500 <= currentBid
                      }
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded text-sm"
                    >
                      500원
                    </button>
                    <button
                      onClick={() => placeBid(team.name, 1000)}
                      disabled={
                        !timerActive || team.budget < 1000 || 1000 <= currentBid
                      }
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded text-sm"
                    >
                      1000원
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customBidAmount[team.name] || ''}
                      onChange={(e) =>
                        setCustomBidAmount({
                          ...customBidAmount,
                          [team.name]: e.target.value,
                        })
                      }
                      onKeyPress={(e) =>
                        e.key === 'Enter' && placeCustomBid(team.name)
                      }
                      placeholder="직접 입력"
                      disabled={!timerActive}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm disabled:opacity-50"
                    />
                    <button
                      onClick={() => placeCustomBid(team.name)}
                      disabled={
                        !timerActive ||
                        !customBidAmount[team.name] ||
                        team.budget < Number(customBidAmount[team.name]) ||
                        Number(customBidAmount[team.name]) <= currentBid
                      }
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-bold"
                    >
                      입찰
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 진행 상황 */}
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">
                진행 상황: {currentPlayerIndex + 1} / {players.length}
                {unsoldPlayers.length > 0 && !isResale && (
                  <span className="ml-4 text-orange-400">
                    (유찰: {unsoldPlayers.length}명)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 완료 단계 */}
        {phase === 'complete' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-8 text-center">
              <h2 className="text-4xl font-bold mb-2">🎉 경매 완료!</h2>
              <p className="text-xl">최종 팀 구성을 확인하세요</p>
            </div>

            {teams.map((team, idx) => {
              const uniquePlayers = team.players.filter(
                (player, index, self) =>
                  index === self.findIndex((p) => p.name === player.name)
              );

              return (
                <div key={idx} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">{team.name}</h3>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">남은 예산</div>
                      <div className="text-xl font-bold text-green-400">
                        {team.budget.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {uniquePlayers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">
                        선수 없음
                      </div>
                    ) : (
                      uniquePlayers.map((player, pIdx) => (
                        <div
                          key={pIdx}
                          className="bg-gray-700 p-3 rounded flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold">{player.name}</div>
                            <div className="text-sm text-gray-400">
                              {player.tier}
                            </div>
                          </div>
                          <div className="text-yellow-400 font-bold">
                            {player.price.toLocaleString()}원
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {unsoldPlayers.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-2xl font-bold mb-4 text-orange-400">
                  최종 유찰 선수
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unsoldPlayers.map((player, idx) => (
                    <div key={idx} className="bg-gray-700 p-3 rounded">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.tier}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={resetAuction}
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-lg text-xl font-bold"
            >
              새 경매 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
