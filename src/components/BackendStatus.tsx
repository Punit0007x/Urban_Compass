import React from 'react';
import { useHealthCheck } from '@/services/hooks';
import { Activity, Wifi, WifiOff } from 'lucide-react';

const BackendStatus = () => {
  const { data: health, isLoading, isError } = useHealthCheck();
  
  const getStatusColor = () => {
    if (isLoading) return 'bg-yellow-400';
    if (isError || !health) return 'bg-red-500';
    return 'bg-emerald-400';
  };

  const getStatusText = () => {
    if (isLoading) return 'Connecting...';
    if (isError || !health) return 'Offline';
    return 'Connected';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
        {(!isError && health) && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${getStatusColor()} opacity-50 animate-ping`} />
        )}
      </div>
      <Activity className={`w-3 h-3 ${!isError && health ? 'text-emerald-400' : 'text-red-400'}`} />
      <span className={`text-[10px] font-medium ${!isError && health ? 'text-emerald-300' : 'text-red-300'}`}>
        {getStatusText()}
      </span>
      {health && (
        <span className="text-[9px] text-white/40 font-normal ml-1">
          {health.service}
        </span>
      )}
    </div>
  );
};

export default BackendStatus;