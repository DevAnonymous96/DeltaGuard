'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Overview } from '@/components/dashboard/Overview';
import { ILMonitor } from '@/components/dashboard/ILMonitor';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { Wallet, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { address, isConnected } = useAccount();

  console.log('isConnected:', isConnected);
  // If wallet not connected, show connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to access the dashboard and start managing your liquidity positions with predictive IL protection.
            </p>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Click &quot;Connect Wallet&quot; above</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose your preferred wallet provider
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approve the connection</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your wallet will ask for permission
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Start managing positions</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create positions with predictive IL protection
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Don&apos;t have a wallet? Try these:
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="https://metamask.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  MetaMask
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://rainbow.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Rainbow
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://www.coinbase.com/wallet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Coinbase Wallet
                </a>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">No wallet required:</span> Try the{' '}
                <a href="/simulator" className="text-primary hover:underline">
                  IL Simulator
                </a>{' '}
                to predict impermanent loss without connecting
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main Dashboard - Wallet Connected
  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1">
        <DashboardSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back! Monitor your positions and manage IL risk.
              </p>
            </motion.div>

            {/* Overview Stats */}
            <Overview />

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* IL Monitor - Takes 2 columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2"
              >
                <ILMonitor />
              </motion.div>

              {/* Quick Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-6"
              >
                {/* Performance Card */}
                <div className="p-6 rounded-xl border border-border bg-linear-to-br from-primary/10 to-secondary/10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Performance</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        7-Day P&L
                      </p>
                      <p className="text-2xl font-bold text-green-500">
                        +$3,420
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +2.7% return
                      </p>
                    </div>
                    
                    <div className="h-px bg-border" />
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          IL Prevented
                        </p>
                        <p className="font-semibold">$1,250</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Fees Earned
                        </p>
                        <p className="font-semibold text-green-500">$4,670</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Public Goods Card */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg">💚</span>
                    Public Goods Impact
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Donated:</span>
                      <span className="font-medium">$1,260</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Projects:</span>
                      <span className="font-medium">5</span>
                    </div>
                    <div className="mt-3 p-2 rounded bg-muted/50 text-xs text-center text-muted-foreground">
                      Via Octant Integration
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Positions Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <PositionsTable />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}