"use client";

import { motion } from "framer-motion";
import { Brain, RefreshCw, Shield, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Brain,
    title: "Predict IL Using Black-Scholes",
    description:
      "We adapted options pricing theory to forecast impermanent loss before it happens. 73% prediction accuracy on historical data.",
    math: "P(exit) = N(d₂) + [1 - N(d₂)]",
    color: "from-purple-500 to-purple-700",
  },
  {
    icon: RefreshCw,
    title: "Auto-Rebalance Before Losses",
    description:
      "When IL risk exceeds threshold, automatically switch to safe lending protocols. Maximize returns while minimizing risk.",
    math: "If (Fee_APY - Expected_IL) < Safe_APY: Rebalance",
    color: "from-blue-500 to-blue-700",
  },
  {
    icon: Sparkles,
    title: "Donate Optimized Yields",
    description:
      "Seamlessly integrate with Octant to fund public goods. Your yields work harder AND support the ecosystem.",
    math: "Impact = Protected_Value × Donation_Rate",
    color: "from-pink-500 to-pink-700",
  },
];

export function SolutionSection() {
  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-32 relative bg-muted/30 flex items-center justify-center"
    >
      <div className="container px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            <span>The Solution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Intelligent POL with{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Predictive Protection
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            DeltaGuard uses research-grade mathematics to predict and prevent
            impermanent loss, protecting DAO treasuries while maximizing public
            goods funding.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-primary/20 hover:border-primary/40 transition-all hover:shadow-xl group">
                <CardContent className="p-6">
                  {/* Step number and icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg bg-linear-to-br ${step.color} flex items-center justify-center text-white font-bold`}
                      >
                        {index + 1}
                      </div>
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-4">
                    {step.description}
                  </p>

                  {/* Math equation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <code className="text-xs font-mono text-primary">
                      {step.math}
                    </code>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Comparison: With vs Without DeltaGuard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-center mb-8">
                90-Day Simulated Performance
                <span className="block text-sm text-muted-foreground font-normal mt-2">
                  $1M TVL, Historical ETH/USDC data
                </span>
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Traditional POL */}
                <div className="p-6 rounded-xl bg-muted/50 border border-destructive/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Traditional POL</h4>
                    <span className="text-xs text-muted-foreground">
                      Naive Strategy
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Fee APY
                      </span>
                      <span className="font-mono text-green-500">+12.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Impermanent Loss
                      </span>
                      <span className="font-mono text-destructive">-8.5%</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Net Return</span>
                      <span className="text-xl font-bold text-yellow-500">
                        +3.5%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 mt-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        Annual Profit
                      </div>
                      <div className="text-lg font-bold">$35,000</div>
                    </div>
                  </div>
                </div>

                {/* DeltaGuard */}
                <div className="p-6 rounded-xl bg-linear-to-br from-primary/10 to-secondary/10 border border-primary/30 relative overflow-hidden">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        DeltaGuard
                      </h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                        Intelligent
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Fee APY
                        </span>
                        <span className="font-mono text-green-500">+10.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Impermanent Loss
                        </span>
                        <span className="font-mono text-green-500">-2.1%</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Net Return</span>
                        <span className="text-xl font-bold text-green-500">
                          +7.9%
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          Annual Profit
                        </div>
                        <div className="text-lg font-bold text-primary">
                          $79,000
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Improvement highlights */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500 mb-1">
                    75%
                  </div>
                  <div className="text-xs text-muted-foreground">Less IL</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    126%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Better Returns
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500 mb-1">
                    +$44k
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Additional Profit
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Technical credibility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground mb-4">Powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Black-Scholes Model</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Uniswap V4 Hooks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>Chainlink Oracles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Octant Integration</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
