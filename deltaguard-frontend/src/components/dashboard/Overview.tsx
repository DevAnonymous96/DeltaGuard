'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { formatUSD, formatPercent } from '@/lib/utils';
import { motion } from 'framer-motion';
import { DepositModal } from '@/components/modals/DepositModal';
import { WithdrawModal } from '@/components/modals/WithdrawModal';

// Mock data - replace with real data from contracts
const mockStats = {
  totalDeposited: 125000,
  totalDepositedChange: 12.5,
  currentValue: 128500,
  currentValueChange: 2.8,
  feesEarned: 4200,
  feesEarnedChange: 8.4,
  currentILRisk: 3.2,
  ilRiskChange: -1.1,
};

const stats = [
  {
    title: 'Total Deposited',
    value: mockStats.totalDeposited,
    change: mockStats.totalDepositedChange,
    icon: DollarSign,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Current Value',
    value: mockStats.currentValue,
    change: mockStats.currentValueChange,
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Fees Earned',
    value: mockStats.feesEarned,
    change: mockStats.feesEarnedChange,
    icon: DollarSign,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Current IL Risk',
    value: mockStats.currentILRisk,
    change: mockStats.ilRiskChange,
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    isPercent: true,
    inverted: true, // Lower is better
  },
];

export function Overview() {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.inverted ? stat.change < 0 : stat.change > 0;
            
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      
                      {stat.change !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(stat.change).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">
                        {stat.isPercent 
                          ? formatPercent(stat.value, 1)
                          : formatUSD(stat.value, 0)
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button 
                  onClick={() => setDepositModalOpen(true)}
                  className="px-4 py-3 rounded-lg gradient-primary text-white font-medium hover:shadow-lg transition-all"
                >
                  + Deposit
                </button>
                <button 
                  onClick={() => setWithdrawModalOpen(true)}
                  className="px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-colors"
                >
                  Withdraw
                </button>
                <button className="px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-colors">
                  Harvest Fees
                </button>
                <button className="px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-colors">
                  Run IL Check
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modals */}
      <DepositModal 
        isOpen={depositModalOpen} 
        onClose={() => setDepositModalOpen(false)} 
      />
      <WithdrawModal 
        isOpen={withdrawModalOpen} 
        onClose={() => setWithdrawModalOpen(false)}
        position={{
          id: '1',
          deposited: mockStats.totalDeposited,
          currentValue: mockStats.currentValue,
          feesEarned: mockStats.feesEarned,
          ilRisk: mockStats.currentILRisk,
        }}
      />
    </>
  );
}