"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github, Twitter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 sm:py-32 relative overflow-hidden flex items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-secondary/20 to-background gradient-animate" />

      <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Main heading */}
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
            Ready to{" "}
            <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Protect Your Treasury?
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join the future of intelligent liquidity management. No wallet
            required to explore our IL simulator.
          </p>

          {/* Primary CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="xl"
              variant="glow"
              className="group w-full sm:w-auto"
              onClick={() => {
                // Navigate to simulator or dashboard
                window.location.href = "/simulator";
              }}
            >
              Start Protecting Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              size="xl"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                // Navigate to simulator
                window.location.href = "/simulator";
              }}
            >
              Try IL Simulator
            </Button>
          </div>

          {/* Secondary links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="https://github.com/yourusername/intelligent-pol-system"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>

            <a
              href="/docs"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Read Docs</span>
            </a>

            <a
              href="https://twitter.com/IntelligentPOL"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span>Follow Updates</span>
            </a>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 pt-8 border-t border-border"
          >
            <p className="text-sm text-muted-foreground mb-6">
              Built with industry-leading technologies
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              <div className="text-sm font-medium">Uniswap V4</div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <div className="text-sm font-medium">Chainlink</div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <div className="text-sm font-medium">Octant</div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <div className="text-sm font-medium">Foundry</div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <div className="text-sm font-medium">OpenZeppelin</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
    </section>
  );
}
