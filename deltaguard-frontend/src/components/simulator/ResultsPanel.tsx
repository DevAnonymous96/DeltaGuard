'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  Download,
  Share2
} from 'lucide-react';
import { formatPercent, formatUSD, getRiskLevel, getRiskColor, getRiskBgColor } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ResultsPanel() {
  const { 
    result, 
    depositAmount,
    feeAPY,
    timeHorizonDays,
    saveToHistory 
  } = useSimulatorStore();

  if (!result) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Adjust parameters and click<br />
            <span className="font-semibold">&quot;Run Prediction&quot;</span><br />
            to see results
          </p>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(result.expectedIL);
  const riskColor = getRiskColor(riskLevel);
  const riskBg = getRiskBgColor(riskLevel);

  // Calculate dollar amounts
  const ilLoss = (result.expectedIL / 100) * depositAmount;
  const feeEarnings = depositAmount * (feeAPY / 100) * (timeHorizonDays / 365);
  const netPnL = feeEarnings - ilLoss;

  const getRecommendationIcon = () => {
    switch (result.recommendation) {
      case 'safe':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'moderate':
        return <Info className="w-6 h-6 text-blue-500" />;
      case 'high':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'critical':
        return <XCircle className="w-6 h-6 text-destructive" />;
    }
  };

  const getRecommendationText = () => {
    switch (result.recommendation) {
      case 'safe':
        return 'Safe to Deploy';
      case 'moderate':
        return 'Moderate Risk';
      case 'high':
        return 'High Risk - Monitor Closely';
      case 'critical':
        return 'Critical Risk - Avoid LP';
    }
  };

  const getRecommendationDescription = () => {
    switch (result.recommendation) {
      case 'safe':
        return 'Expected IL is minimal. This position has good risk/reward characteristics.';
      case 'moderate':
        return 'Expected IL is manageable. Monitor position regularly and be prepared to rebalance.';
      case 'high':
        return 'Expected IL is significant. Consider narrowing your range or reducing exposure.';
      case 'critical':
        return 'Expected IL exceeds fee earnings. Switch to safe lending or wait for better market conditions.';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Prediction Results
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Metrics */}
        <div className="space-y-4">
          {/* Expected IL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-lg border ${riskBg}`}
          >
            <div className="text-sm text-muted-foreground mb-1">
              Expected Impermanent Loss
            </div>
            <div className={`text-3xl font-bold ${riskColor}`}>
              {formatPercent(result.expectedIL, 2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Over {timeHorizonDays} days
            </div>
          </motion.div>

          {/* Exit Probability */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground mb-1">
              Exit Probability
            </div>
            <div className="text-2xl font-bold">
              {formatPercent(result.exitProbability, 1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Chance of price leaving range
            </div>
          </div>

          {/* Confidence */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground mb-1">
              Prediction Confidence
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatPercent(result.confidence, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on volatility & time horizon
            </div>
          </div>
        </div>

        {/* Recommendation Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg border ${riskBg}`}
        >
          <div className="flex items-start gap-3">
            {getRecommendationIcon()}
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {getRecommendationText()}
              </div>
              <p className="text-sm text-muted-foreground">
                {getRecommendationDescription()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Financial Breakdown */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold">Financial Breakdown</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit Amount:</span>
              <span className="font-medium">{formatUSD(depositAmount, 0)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Fees:</span>
              <span className="font-medium text-green-500">
                +{formatUSD(feeEarnings, 0)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected IL Loss:</span>
              <span className="font-medium text-destructive">
                -{formatUSD(ilLoss, 0)}
              </span>
            </div>
            
            <div className="h-px bg-border my-2" />
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Net P&L:</span>
              <span className={`text-lg font-bold ${netPnL >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {netPnL >= 0 ? '+' : ''}{formatUSD(netPnL, 0)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Return:</span>
              <span className={`font-medium ${netPnL >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {formatPercent(result.netReturn, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Rebalance Decision */}
        <div className={`p-3 rounded-lg ${result.shouldRebalance ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'} border`}>
          <div className="flex items-center gap-2 mb-1">
            {result.shouldRebalance ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm font-semibold">
              {result.shouldRebalance ? 'Rebalance Recommended' : 'Continue LP Position'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.shouldRebalance 
              ? 'Consider switching to safe lending protocols (Aave, Morpho) for better risk-adjusted returns.'
              : 'Current position has positive expected value. Continue providing liquidity.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={saveToHistory}
          >
            <Download className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // Share functionality
              if (navigator.share) {
                navigator.share({
                  title: 'DeltaGuard IL Prediction',
                  text: `Expected IL: ${formatPercent(result.expectedIL, 2)}`,
                  url: window.location.href,
                });
              }
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-center text-muted-foreground">
          Calculated {new Date(result.calculatedAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}