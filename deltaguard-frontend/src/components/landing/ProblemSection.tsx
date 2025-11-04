'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { calculateIL, formatPercent, formatUSD } from '@/lib/utils';

export function ProblemSection() {
  const [initialPrice, setInitialPrice] = useState(2000);
  const [finalPrice, setFinalPrice] = useState(3000);
  
  const ilPercent = calculateIL(initialPrice, finalPrice);
  const priceChange = ((finalPrice - initialPrice) / initialPrice) * 100;
  
  // Example: $1M deposit
  const depositAmount = 1000000;
  const ilLoss = (ilPercent / 100) * depositAmount;

  return (
    <section id="problem" className="py-20 sm:py-32 relative flex items-center justify-center">
      <div className="container px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4" />
            <span>The Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            DAOs Are Losing{' '}
            <span className="text-destructive">Millions</span> to IL
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Current Protocol-Owned Liquidity (POL) strategies are naive and reactive. 
            They deploy blindly and hope fee revenue exceeds losses.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Interactive IL Calculator */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-primary" />
                  Interactive IL Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Initial Price Slider */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Initial Price: ${initialPrice.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={initialPrice}
                    onChange={(e) => setInitialPrice(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Final Price Slider */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Final Price: ${finalPrice.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                {/* Results */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price Change:</span>
                    <span className={`font-semibold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange >= 0 ? '+' : ''}{formatPercent(priceChange, 1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Impermanent Loss:</span>
                    <span className="text-xl font-bold text-destructive">
                      {formatPercent(ilPercent, 2)}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      On a $1M deposit, you&apos;d lose:
                    </p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatUSD(ilLoss, 0)}
                    </p>
                  </div>
                </div>

                {/* Visual IL Curve */}
                <div className="h-40 bg-muted/50 rounded-lg relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="80" x2="400" y2="80" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                    
                    {/* IL Curve */}
                    <path
                      d={generateILCurve()}
                      fill="none"
                      stroke="rgb(239, 68, 68)"
                      strokeWidth="3"
                      className="animate-fade-in"
                    />
                    
                    {/* Current point marker */}
                    <circle
                      cx={(finalPrice / initialPrice) * 100}
                      cy={80 - (ilPercent * 2)}
                      r="5"
                      fill="rgb(239, 68, 68)"
                      className="animate-pulse"
                    />
                  </svg>
                  
                  {/* Labels */}
                  <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                    0.5x price
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    2x price
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Problem stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Stat card 1 */}
            <Card className="border-destructive/30 hover:border-destructive/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <X className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">42% Average IL</h3>
                    <p className="text-sm text-muted-foreground">
                      In high volatility periods, LPs regularly experience double-digit impermanent loss
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stat card 2 */}
            <Card className="border-destructive/30 hover:border-destructive/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">$XXM Lost Monthly</h3>
                    <p className="text-sm text-muted-foreground">
                      DAO treasuries hemorrhage value through poorly managed liquidity positions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stat card 3 */}
            <Card className="border-destructive/30 hover:border-destructive/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">100% Reactive</h3>
                    <p className="text-sm text-muted-foreground">
                      Current strategies only respond AFTER losses occur. No prediction, no prevention.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real example callout */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20">
              <p className="text-sm font-medium mb-2">Real Example:</p>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimism DAO deploys:</span>
                  <span>$20M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee APY:</span>
                  <span className="text-green-500">+8%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impermanent Loss:</span>
                  <span className="text-destructive">-12%</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-bold">
                  <span>Net Return:</span>
                  <span className="text-destructive">-4% (-$800k)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Helper function to generate IL curve path
function generateILCurve(): string {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= 400; i += 10) {
    const priceRatio = (i / 200); // 0.5x to 2x
    const il = Math.abs((2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1) * 100;
    const x = i;
    const y = 80 - (il * 2); // Invert Y and scale
    points.push([x, y]);
  }
  
  return `M ${points.map(([x, y]) => `${x},${y}`).join(' L ')}`;
}