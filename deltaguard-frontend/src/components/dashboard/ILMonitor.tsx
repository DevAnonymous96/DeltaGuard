'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatPercent, getRiskLevel, getRiskColor, getRiskBgColor } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';

// Mock data - replace with real-time data
const mockData = {
  currentIL: 3.2,
  currentPrice: 2450,
  lowerBound: 2000,
  upperBound: 3000,
  lastCheck: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
  nextRebalance: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours
  historicalIL: [
    { time: '00:00', il: 2.1 },
    { time: '04:00', il: 2.5 },
    { time: '08:00', il: 2.8 },
    { time: '12:00', il: 3.1 },
    { time: '16:00', il: 3.4 },
    { time: '20:00', il: 3.2 },
  ],
};

export function ILMonitor() {
  const riskLevel = getRiskLevel(mockData.currentIL);
  const riskColor = getRiskColor(riskLevel);
  const riskBg = getRiskBgColor(riskLevel);
  
  const isInRange = mockData.currentPrice >= mockData.lowerBound && 
                    mockData.currentPrice <= mockData.upperBound;

  const rangePercentage = ((mockData.currentPrice - mockData.lowerBound) / 
                           (mockData.upperBound - mockData.lowerBound)) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Real-time IL Monitor
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current IL Display */}
        <div className={`p-6 rounded-lg border ${riskBg}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Current IL Risk
              </p>
              <p className={`text-4xl font-bold ${riskColor}`}>
                {formatPercent(mockData.currentIL, 2)}
              </p>
            </div>
            
            {riskLevel === 'safe' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : riskLevel === 'critical' ? (
              <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground capitalize">
            {riskLevel} Risk Level
          </p>
        </div>

        {/* Price Range Indicator */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Position Range</span>
            <span className={`font-medium ${isInRange ? 'text-green-500' : 'text-destructive'}`}>
              {isInRange ? 'In Range ✓' : 'Out of Range ✗'}
            </span>
          </div>
          
          {/* Visual range bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Range background */}
            <div 
              className="absolute h-full bg-primary/20"
              style={{ width: '100%' }}
            />
            
            {/* Current price indicator */}
            {isInRange && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute h-full w-1 bg-primary"
                style={{ left: `${rangePercentage}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-pulse" />
              </motion.div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>${mockData.lowerBound.toLocaleString()}</span>
            <span className="font-medium">${mockData.currentPrice.toLocaleString()}</span>
            <span>${mockData.upperBound.toLocaleString()}</span>
          </div>
        </div>

        {/* Historical IL Chart */}
        <div>
          <p className="text-sm font-medium mb-3">IL Over Last 24h</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={mockData.historicalIL}>
              <defs>
                <linearGradient id="ilGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(239, 68, 68)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="rgb(239, 68, 68)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="currentColor"
                className="text-muted-foreground"
                style={{ fontSize: '10px' }}
              />
              <YAxis 
                stroke="currentColor"
                className="text-muted-foreground"
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'IL']}
              />
              <Area 
                type="monotone" 
                dataKey="il" 
                stroke="rgb(239, 68, 68)" 
                strokeWidth={2}
                fill="url(#ilGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              Last Check
            </div>
            <p className="text-sm font-medium">
              {Math.round((Date.now() - mockData.lastCheck.getTime()) / 60000)} min ago
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              Next Rebalance
            </div>
            <p className="text-sm font-medium">
              {Math.round((mockData.nextRebalance.getTime() - Date.now()) / 3600000)}h
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        {riskLevel === 'high' || riskLevel === 'critical' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg ${riskBg} border`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 ${riskColor} mt-0.5`} />
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">
                  {riskLevel === 'critical' ? 'Critical IL Risk Detected' : 'High IL Risk'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {riskLevel === 'critical' 
                    ? 'Immediate rebalancing recommended. Consider switching to safe lending.'
                    : 'Monitor closely. Prepare to rebalance if IL increases further.'}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1 text-green-500">
                  Position Healthy
                </p>
                <p className="text-xs text-muted-foreground">
                  IL risk is within acceptable range. Continue monitoring.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}