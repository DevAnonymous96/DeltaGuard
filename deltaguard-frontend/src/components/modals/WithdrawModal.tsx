'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUSD, formatPercent, formatNumber } from '@/lib/utils';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: {
    id: string;
    deposited: number;
    currentValue: number;
    feesEarned: number;
    ilRisk: number;
  };
}

export function WithdrawModal({ isOpen, onClose, position }: WithdrawModalProps) {
  const [percentage, setPercentage] = useState(100);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');

  if (!position || !isOpen) return null;

  // Calculate withdrawal amounts
  const withdrawValue = (position.currentValue * percentage) / 100;
  const withdrawFees = (position.feesEarned * percentage) / 100;
  const realizedIL = (position.deposited - position.currentValue) * (percentage / 100);
  const netPnL = withdrawValue + withdrawFees - (position.deposited * percentage / 100);

  const handleWithdraw = async () => {
    setTxStatus('pending');

    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      setTxHash('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
      setTxStatus('success');
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      setTxStatus('error');
    }
  };

  const handleClose = () => {
    if (txStatus === 'pending') return;
    setPercentage(100);
    setTxStatus('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Withdraw Liquidity</h2>
            <p className="text-sm text-muted-foreground">
              Remove liquidity from your position
            </p>
          </div>
          
          {txStatus !== 'pending' && (
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {txStatus === 'idle' && (
            <div className="space-y-6">
              {/* Amount Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">
                    Withdrawal Amount
                  </label>
                  <span className="text-2xl font-bold text-primary">
                    {percentage}%
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                
                <div className="flex justify-between mt-2">
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      onClick={() => setPercentage(value)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        percentage === value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>

              {/* What You'll Receive */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <h3 className="font-semibold text-sm">What You&apos;ll Receive</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position Value:</span>
                    <span className="font-medium">{formatUSD(withdrawValue, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accumulated Fees:</span>
                    <span className="font-medium text-green-500">
                      +{formatUSD(withdrawFees, 0)}
                    </span>
                  </div>
                  
                  {realizedIL !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Realized IL:</span>
                      <span className={`font-medium ${realizedIL < 0 ? 'text-destructive' : 'text-green-500'}`}>
                        {realizedIL < 0 ? '' : '+'}{formatUSD(realizedIL, 0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="h-px bg-border my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className={`text-xl font-bold ${netPnL >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {formatUSD(withdrawValue + withdrawFees, 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Net P&L:</span>
                    <span className={netPnL >= 0 ? 'text-green-500' : 'text-destructive'}>
                      {netPnL >= 0 ? '+' : ''}{formatUSD(netPnL, 0)} 
                      ({netPnL >= 0 ? '+' : ''}{formatPercent((netPnL / (position.deposited * percentage / 100)) * 100, 2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Token Breakdown */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <h3 className="font-semibold text-sm mb-3">Estimated Tokens</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      Ξ
                    </div>
                    <span className="text-sm">ETH</span>
                  </div>
                  <span className="font-medium">
                    {formatNumber((withdrawValue / 2) / 2500, 4)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">
                      $
                    </div>
                    <span className="text-sm">USDC</span>
                  </div>
                  <span className="font-medium">
                    {formatNumber(withdrawValue / 2, 2)} USDC
                  </span>
                </div>
              </div>

              {/* Warning if withdrawing at loss */}
              {netPnL < 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">
                        Withdrawing at a Loss
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You&apos;re withdrawing at a net loss of {formatUSD(Math.abs(netPnL), 0)}. 
                        Consider waiting for better market conditions or reduced IL risk.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info about fees */}
              {percentage < 100 && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  💡 Partial withdrawal will keep your remaining position active. 
                  Fees will continue to accumulate on the remaining liquidity.
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleWithdraw}
                disabled={percentage === 0}
              >
                Confirm Withdrawal
              </Button>
            </div>
          )}

          {/* Transaction Status */}
          {txStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              {txStatus === 'pending' && (
                <>
                  <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-bold mb-2">Processing Withdrawal</h3>
                  <p className="text-muted-foreground">
                    Please confirm in your wallet...
                  </p>
                </>
              )}

              {txStatus === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Withdrawal Successful!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your liquidity has been withdrawn
                  </p>
                  <p className="text-sm font-medium mb-2">
                    Received: {formatUSD(withdrawValue + withdrawFees, 0)}
                  </p>
                  {txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on Etherscan →
                    </a>
                  )}
                </>
              )}

              {txStatus === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Transaction Failed</h3>
                  <p className="text-muted-foreground mb-6">
                    Something went wrong. Please try again.
                  </p>
                  <Button onClick={handleClose}>Close</Button>
                </>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}