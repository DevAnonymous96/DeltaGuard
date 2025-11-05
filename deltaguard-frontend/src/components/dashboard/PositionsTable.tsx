'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, ExternalLink, MoreVertical } from 'lucide-react';
import { formatUSD, formatPercent, getRiskLevel, getRiskColor } from '@/lib/utils';
import { motion } from 'framer-motion';

// Mock positions data
const mockPositions = [
  {
    id: '1',
    pool: 'ETH/USDC',
    deposited: 50000,
    currentValue: 51200,
    feesEarned: 1800,
    ilRisk: 2.4,
    status: 'active' as const,
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
  },
  {
    id: '2',
    pool: 'ETH/USDC',
    deposited: 75000,
    currentValue: 77300,
    feesEarned: 2400,
    ilRisk: 3.8,
    status: 'warning' as const,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  },
];

const statusConfig = {
  active: {
    label: 'Active',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  warning: {
    label: 'Warning',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  idle: {
    label: 'Idle',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
  rebalancing: {
    label: 'Rebalancing',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
};

export function PositionsTable() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Active Positions
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <select className="px-3 py-1.5 rounded-lg bg-muted text-sm">
              <option>All Pools</option>
              <option>ETH/USDC</option>
              <option>BTC/USDC</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {mockPositions.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              No active positions yet
            </p>
            <button className="px-4 py-2 rounded-lg gradient-primary text-white font-medium">
              Create Position
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mockPositions.map((position, index) => {
              const pnl = position.currentValue - position.deposited + position.feesEarned;
              const pnlPercent = (pnl / position.deposited) * 100;
              const riskLevel = getRiskLevel(position.ilRisk);
              const riskColor = getRiskColor(riskLevel);
              const status = statusConfig[position.status];
              const daysActive = Math.round((Date.now() - position.createdAt) / (24 * 60 * 60 * 1000));

              return (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => window.location.href = `/dashboard/positions/${position.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Pool Icons */}
                      <div className="flex items-center -space-x-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-sm font-bold">
                          Ξ
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-background flex items-center justify-center text-sm font-bold">
                          $
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold group-hover:text-primary transition-colors">
                          {position.pool}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Active for {daysActive} days
                        </p>
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Deposited</p>
                      <p className="text-sm font-medium">
                        {formatUSD(position.deposited, 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                      <p className="text-sm font-medium">
                        {formatUSD(position.currentValue, 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fees Earned</p>
                      <p className="text-sm font-medium text-green-500">
                        +{formatUSD(position.feesEarned, 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">IL Risk</p>
                      <p className={`text-sm font-medium ${riskColor}`}>
                        {formatPercent(position.ilRisk, 1)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">P&L</p>
                      <p className={`text-sm font-medium ${pnl >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                        {pnl >= 0 ? '+' : ''}{formatUSD(pnl, 0)}
                        <span className="text-xs ml-1">
                          ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
                    <button 
                      className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle action
                      }}
                    >
                      Manage
                    </button>
                    <button 
                      className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://sepolia.etherscan.io/address/${position.id}`, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}