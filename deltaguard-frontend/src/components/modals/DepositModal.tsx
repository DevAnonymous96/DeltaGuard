'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUSD, formatNumber } from '@/lib/utils';
import { calculateExpectedIL, calculateExitProbability } from '@/lib/calculations/ilCalculator';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'assets' | 'range' | 'review' | 'transaction';

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('assets');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lowerPrice, setLowerPrice] = useState(2000);
  const [upperPrice, setUpperPrice] = useState(3000);
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // Mock balances - replace with real balances from wallet
  const balances = {
    eth: 5.234,
    usdc: 12500,
  };

  const currentPrice = 2500; // Mock - get from oracle
  const volatility = 0.65;
  const timeHorizon = 30;

  // Calculate expected IL for current range
  const expectedIL = calculateExpectedIL(currentPrice, lowerPrice, upperPrice, volatility, timeHorizon);
  const exitProbability = calculateExitProbability(currentPrice, lowerPrice, upperPrice, volatility, timeHorizon);

  const handleClose = () => {
    if (txStatus === 'pending') return; // Prevent closing during transaction
    setCurrentStep('assets');
    setAmount0('');
    setAmount1('');
    setTxStatus('idle');
    onClose();
  };

  const handleNext = () => {
    const steps: Step[] = ['assets', 'range', 'review', 'transaction'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['assets', 'range', 'review', 'transaction'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleDeposit = async () => {
    setCurrentStep('transaction');
    setTxStatus('pending');

    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      setTxStatus('success');
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
        window.location.href = '/dashboard';
      }, 3000);
    } catch (error) {
      setTxStatus('error');
    }
  };

  const applyStrategy = (strategy: 'conservative' | 'moderate' | 'aggressive') => {
    const ranges = {
      conservative: { lower: 0.85, upper: 1.18 },
      moderate: { lower: 0.75, upper: 1.33 },
      aggressive: { lower: 0.5, upper: 2.0 },
    };
    
    const range = ranges[strategy];
    setLowerPrice(currentPrice * range.lower);
    setUpperPrice(currentPrice * range.upper);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            {currentStep !== 'assets' && currentStep !== 'transaction' && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold">Deposit Liquidity</h2>
              <p className="text-sm text-muted-foreground">
                {currentStep === 'assets' && 'Step 1: Choose amounts'}
                {currentStep === 'range' && 'Step 2: Configure strategy'}
                {currentStep === 'review' && 'Step 3: Review & confirm'}
                {currentStep === 'transaction' && 'Processing transaction...'}
              </p>
            </div>
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

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {['assets', 'range', 'review'].map((step, index) => (
              <div key={step} className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full transition-colors ${
                  currentStep === step || ['review', 'transaction'].includes(currentStep) && index < 2 || currentStep === 'transaction' && index < 3
                    ? 'bg-primary'
                    : 'bg-muted'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Assets */}
            {currentStep === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* ETH Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    ETH Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount0}
                      onChange={(e) => setAmount0(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => setAmount0(balances.eth.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: {balances.eth} ETH
                  </p>
                </div>

                {/* USDC Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    USDC Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount1}
                      onChange={(e) => setAmount1(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => setAmount1(balances.usdc.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: ${formatNumber(balances.usdc, 2)} USDC
                  </p>
                </div>

                {/* Value Summary */}
                {amount0 && amount1 && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Total Value
                    </p>
                    <p className="text-2xl font-bold">
                      {formatUSD(parseFloat(amount0) * currentPrice + parseFloat(amount1), 0)}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleNext}
                  disabled={!amount0 || !amount1 || parseFloat(amount0) <= 0 || parseFloat(amount1) <= 0}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Range */}
            {currentStep === 'range' && (
              <motion.div
                key="range"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Current Price */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Price
                  </p>
                  <p className="text-2xl font-bold">
                    ${formatNumber(currentPrice, 2)}
                  </p>
                </div>

                {/* Strategy Presets */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Strategy Presets
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['conservative', 'moderate', 'aggressive'] as const).map((strategy) => (
                      <button
                        key={strategy}
                        onClick={() => applyStrategy(strategy)}
                        className="px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 font-medium capitalize transition-colors"
                      >
                        {strategy}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Sliders */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Lower Price: ${formatNumber(lowerPrice, 2)}
                    </label>
                    <input
                      type="range"
                      min={currentPrice * 0.3}
                      max={currentPrice}
                      step={currentPrice * 0.01}
                      value={lowerPrice}
                      onChange={(e) => setLowerPrice(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-destructive"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Upper Price: ${formatNumber(upperPrice, 2)}
                    </label>
                    <input
                      type="range"
                      min={currentPrice}
                      max={currentPrice * 3}
                      step={currentPrice * 0.01}
                      value={upperPrice}
                      onChange={(e) => setUpperPrice(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                </div>

                {/* IL Prediction */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium mb-3">Live IL Prediction</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Expected IL (30d)
                      </p>
                      <p className="text-xl font-bold text-primary">
                        {expectedIL.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Exit Probability
                      </p>
                      <p className="text-xl font-bold">
                        {exitProbability.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleNext}
                >
                  Continue to Review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Summary */}
                <div className="p-6 rounded-lg bg-muted/50 border border-border space-y-4">
                  <h3 className="font-semibold">Deposit Summary</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ETH Amount:</span>
                      <span className="font-medium">{amount0} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">USDC Amount:</span>
                      <span className="font-medium">{amount1} USDC</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-semibold text-lg">
                        {formatUSD(parseFloat(amount0) * currentPrice + parseFloat(amount1), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Range Info */}
                <div className="p-6 rounded-lg bg-muted/50 border border-border space-y-2">
                  <h3 className="font-semibold mb-3">Price Range</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lower:</span>
                    <span className="font-medium">${formatNumber(lowerPrice, 2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Upper:</span>
                    <span className="font-medium">${formatNumber(upperPrice, 2)}</span>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className={`p-4 rounded-lg border ${
                  expectedIL < 5 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-orange-500/10 border-orange-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {expectedIL < 5 ? (
                      <Check className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">
                        {expectedIL < 5 ? 'Good Risk Profile' : 'Moderate Risk'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expected IL: {expectedIL.toFixed(2)}% over 30 days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confirmations */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <span className="text-sm text-muted-foreground">
                      I understand the risks of impermanent loss and have reviewed the prediction
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <span className="text-sm text-muted-foreground">
                      I agree to donate ~30% of yields to public goods via Octant
                    </span>
                  </label>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDeposit}
                >
                  Confirm Deposit
                </Button>
              </motion.div>
            )}

            {/* Step 4: Transaction */}
            {currentStep === 'transaction' && (
              <motion.div
                key="transaction"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                {txStatus === 'pending' && (
                  <>
                    <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-bold mb-2">Processing Transaction</h3>
                    <p className="text-muted-foreground mb-6">
                      Please confirm in your wallet and wait for confirmation...
                    </p>
                  </>
                )}

                {txStatus === 'success' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Deposit Successful!</h3>
                    <p className="text-muted-foreground mb-4">
                      Your liquidity has been deposited successfully
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
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}