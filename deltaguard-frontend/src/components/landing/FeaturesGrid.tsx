"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  RefreshCw,
  Eye,
  Heart,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: TrendingUp,
    title: "Predictive IL Analysis",
    description:
      "Black-Scholes-based forecasting with 73% accuracy. Know your IL risk before deploying.",
    gradient: "from-purple-500 to-purple-700",
    size: "large", // Takes 2 columns
  },
  {
    icon: RefreshCw,
    title: "Automated Rebalancing",
    description:
      "Switch to safe lending when IL risk exceeds threshold. No manual intervention needed.",
    gradient: "from-blue-500 to-blue-700",
    size: "medium",
  },
  {
    icon: Eye,
    title: "Real-time Risk Monitoring",
    description:
      "Live position health tracking with instant alerts for high-risk situations.",
    gradient: "from-cyan-500 to-cyan-700",
    size: "medium",
  },
  {
    icon: Heart,
    title: "Octant Integration",
    description:
      "Auto-donate optimized yields to public goods. Maximize ecosystem impact.",
    gradient: "from-pink-500 to-pink-700",
    size: "medium",
  },
  {
    icon: Layers,
    title: "Multi-Pool Support",
    description:
      "Deploy across multiple Uniswap V4 pools with intelligent allocation.",
    gradient: "from-green-500 to-green-700",
    size: "medium",
  },
  {
    icon: Shield,
    title: "Historical Analytics",
    description:
      "Track prediction accuracy, IL prevented, and strategy performance over time.",
    gradient: "from-orange-500 to-orange-700",
    size: "large",
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-20 sm:py-32 relative flex items-center justify-center">
      <div className="container px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Protect Your Treasury
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Production-ready features designed for DAO treasuries and DeFi
            protocols
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLarge = feature.size === "large";

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={isLarge ? "md:col-span-2" : ""}
              >
                <Card className="h-full group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-primary/20 hover:border-primary/40 overflow-hidden relative">
                  {/* Gradient overlay on hover */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />

                  <CardContent className="p-6 relative z-10">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>

                    {/* Hover effect indicator */}
                    <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-sm font-medium">Learn more</span>
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            Ready to see it in action?
          </p>
          <button
            onClick={() => {
              document
                .getElementById("simulator")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-primary text-white font-medium hover:shadow-xl hover:scale-105 transition-all"
          >
            Try the IL Simulator
            <TrendingUp className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
