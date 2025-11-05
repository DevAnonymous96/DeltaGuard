"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ControlPanel } from "@/components/simulator/ControlPanel";
import { ResultsPanel } from "@/components/simulator/ResultsPanel";
import { ILVisualization } from "@/components/simulator/ILVisualization";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import {
  calculateExpectedIL,
  calculateExitProbability,
  calculateConfidence,
  calculateRebalanceThreshold,
} from "@/lib/calculations/ilCalculator";
import { Calculator, ArrowLeft, Info } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

export default function SimulatorPage() {
  const [isCalculating, setIsCalculating] = useState(false);

  const {
    currentPrice,
    lowerBound,
    upperBound,
    timeHorizonDays,
    volatility,
    feeAPY,
    setResult,
  } = useSimulatorStore();

  const runPrediction = async () => {
    setIsCalculating(true);

    // Simulate calculation delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // Calculate expected IL
      const expectedIL = calculateExpectedIL(
        currentPrice,
        lowerBound,
        upperBound,
        volatility,
        timeHorizonDays
      );

      // Calculate exit probability
      const exitProbability = calculateExitProbability(
        currentPrice,
        lowerBound,
        upperBound,
        volatility,
        timeHorizonDays
      );

      // Calculate confidence
      const confidence = calculateConfidence(volatility, timeHorizonDays);

      // Calculate net return and rebalance decision
      const { shouldRebalance, netReturn } = calculateRebalanceThreshold(
        feeAPY,
        expectedIL
      );

      // Determine recommendation level
      let recommendation: "safe" | "moderate" | "high" | "critical";
      if (expectedIL < 2) {
        recommendation = "safe";
      } else if (expectedIL < 5) {
        recommendation = "moderate";
      } else if (expectedIL < 10) {
        recommendation = "high";
      } else {
        recommendation = "critical";
      }

      // Set result
      setResult({
        expectedIL,
        exitProbability,
        confidence,
        recommendation,
        netReturn,
        shouldRebalance,
        calculatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Prediction error:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="container px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link> */}

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                  IL Simulator
                </h1>
                <p className="text-lg text-muted-foreground">
                  Predict impermanent loss using Black-Scholes options pricing
                  theory
                </p>
              </div>

              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  No wallet required
                </span>
              </div>
            </div>
          </motion.div>

          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">How it works:</p>
                <p className="text-muted-foreground">
                  Adjust the parameters on the left, view the IL curve in the
                  center, and click{" "}
                  <span className="font-semibold">
                    &quot;Run Prediction&quot;
                  </span>{" "}
                  to see expected IL, exit probability, and whether you should
                  provide liquidity or switch to lending.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Column - Controls */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <ControlPanel />
            </motion.div>

            {/* Center Column - Visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-6 space-y-6"
            >
              <ILVisualization />

              {/* Run Prediction Button */}
              <Button
                size="xl"
                className="w-full"
                onClick={runPrediction}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⚙️</span>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 mr-2" />
                    Run Prediction
                  </>
                )}
              </Button>

              {/* Educational Note */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h4 className="text-sm font-semibold mb-2">
                  💡 Understanding the Chart
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    • <span className="font-medium">IL Curve (red)</span>: Shows
                    IL percentage at different price points
                  </li>
                  <li>
                    • <span className="font-medium">Purple box</span>: Your
                    selected price range
                  </li>
                  <li>
                    • <span className="font-medium">Vertical line</span>:
                    Current price position
                  </li>
                  <li>
                    • <span className="font-medium">Wider range</span> = Lower
                    IL risk but potentially fewer fees
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Right Column - Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-3"
            >
              <ResultsPanel />
            </motion.div>
          </div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
              <div className="text-2xl font-bold text-primary mb-1">73%</div>
              <div className="text-sm text-muted-foreground">
                Historical Accuracy
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
              <div className="text-2xl font-bold text-primary mb-1">12,547</div>
              <div className="text-sm text-muted-foreground">
                Predictions Made
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
              <div className="text-2xl font-bold text-primary mb-1">$5.2M</div>
              <div className="text-sm text-muted-foreground">
                Value Protected
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-8 rounded-xl bg-linear-to-r from-primary/10 to-secondary/10 border border-primary/20 text-center"
          >
            <h3 className="text-2xl font-bold mb-2">
              Ready to Protect Your Liquidity?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Deploy with confidence using DeltaGuard&apos;s intelligent POL
              system. Automatic rebalancing, continuous monitoring, and
              integration with Octant for public goods funding.
            </p>
            <Button
              size="lg"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Launch Dashboard
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
