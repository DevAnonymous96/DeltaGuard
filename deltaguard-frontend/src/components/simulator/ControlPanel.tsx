'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { Settings2, TrendingUp, Clock, Activity } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/utils';

export function ControlPanel() {
  const {
    assetPair,
    currentPrice,
    lowerBound,
    upperBound,
    timeHorizonDays,
    volatility,
    feeAPY,
    depositAmount,
    showAdvanced,
    setAssetPair,
    setCurrentPrice,
    setLowerBound,
    setUpperBound,
    setTimeHorizon,
    setVolatility,
    setFeeAPY,
    setDepositAmount,
    toggleAdvanced,
    applyStrategy,
  } = useSimulatorStore();

  const assets: Array<{ value: typeof assetPair; label: string }> = [
    { value: 'ETH/USDC', label: 'ETH/USDC' },
    { value: 'BTC/USDC', label: 'BTC/USDC' },
    { value: 'OP/USDC', label: 'OP/USDC' },
    { value: 'CUSTOM', label: 'Custom' },
  ];

  const timeHorizons = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '180 days' },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Simulation Parameters
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Asset Pair Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Asset Pair
          </label>
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.value}
                onClick={() => setAssetPair(asset.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  assetPair === asset.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {asset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Price */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Current Price: ${formatNumber(currentPrice, 2)}
          </label>
          <input
            type="range"
            min={currentPrice * 0.5}
            max={currentPrice * 2}
            step={currentPrice * 0.01}
            value={currentPrice}
            onChange={(e) => setCurrentPrice(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>${formatNumber(currentPrice * 0.5, 0)}</span>
            <span>${formatNumber(currentPrice * 2, 0)}</span>
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Price Range</label>
            <button
              onClick={toggleAdvanced}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
          
          {/* Lower Bound */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Lower Bound</span>
              <span className="font-medium">${formatNumber(lowerBound, 2)}</span>
            </div>
            <input
              type="range"
              min={currentPrice * 0.3}
              max={currentPrice}
              step={currentPrice * 0.01}
              value={lowerBound}
              onChange={(e) => setLowerBound(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-destructive"
            />
          </div>

          {/* Upper Bound */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Upper Bound</span>
              <span className="font-medium">${formatNumber(upperBound, 2)}</span>
            </div>
            <input
              type="range"
              min={currentPrice}
              max={currentPrice * 3}
              step={currentPrice * 0.01}
              value={upperBound}
              onChange={(e) => setUpperBound(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Strategy Presets */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick Presets:</p>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'moderate', 'aggressive'] as const).map((strategy) => (
                <button
                  key={strategy}
                  onClick={() => applyStrategy(strategy)}
                  className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 capitalize"
                >
                  {strategy}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Time Horizon */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Horizon: {timeHorizonDays} days
          </label>
          <div className="grid grid-cols-4 gap-2">
            {timeHorizons.map((horizon) => (
              <button
                key={horizon.value}
                onClick={() => setTimeHorizon(horizon.value)}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  timeHorizonDays === horizon.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {horizon.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Volatility */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Volatility: {formatPercent(volatility * 100, 1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={volatility}
                onChange={(e) => setVolatility(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low (10%)</span>
                <span>High (150%)</span>
              </div>
            </div>

            {/* Fee APY */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Expected Fee APY: {formatPercent(feeAPY, 1)}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={feeAPY}
                onChange={(e) => setFeeAPY(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Deposit Amount: ${formatNumber(depositAmount, 0)}
              </label>
              <input
                type="range"
                min="1000"
                max="10000000"
                step="1000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$1k</span>
                <span>$10M</span>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Wider ranges have lower IL risk but may earn fewer fees. 
            Adjust based on your risk tolerance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}