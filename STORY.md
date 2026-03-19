# Product Story — Medieval Finance Simulator

## Overview

This project is a mobile-first, asynchronous multiplayer finance simulator created during a hackathon for a banking-related use case.

The goal is to introduce people with little or no prior finance knowledge to the basic ideas of investing, risk, inflation, market cycles, and long-term wealth building in a playful and low-threshold way.

Instead of using modern financial language directly, the game uses a medieval trading metaphor. This makes the experience more intuitive, more story-driven, and less intimidating for beginners.

## Core Vision

The player takes the role of a farmer or merchant living in the Middle Ages.
They earn a regular yearly income in gold from their normal work.
On top of that, they can build wealth by trading and holding different goods over time.

The long-term objective is:

> Earn enough wealth to eventually buy the farm on which the character is currently working.

This creates a simple, motivating end goal that represents financial independence and asset accumulation.

## Target Audience

This simulator is designed for:

- people who are new to finance
- users who are not yet confident with investing terminology
- users who may feel intimidated by topics like stocks, ETFs, or crypto
- hackathon demo audiences who should understand the concept quickly
- mobile users who can interact in short sessions

## Multiplayer Concept

The game should support asynchronous multiplayer:

- each player plays on their own mobile device
- players do not need to be online at the exact same moment
- everyone progresses through the same general game concept independently
- players can compare outcomes through a global leaderboard
- competition should motivate engagement without requiring direct synchronous battles

Possible competitive dimensions:

- highest net worth
- best inflation-adjusted wealth
- fastest path to buying the farm
- strongest portfolio at the end of a fixed number of years
- best performance under difficult market conditions

## Educational Goal

The project should teach players, in a subtle and gamified way, concepts such as:

- regular income
- saving vs investing
- diversification
- risk vs reward
- volatility
- inflation
- market timing tradeoffs
- long-term thinking
- peace and war market behavior
- random external shocks and crises
- the importance of strategy over pure luck

The experience should feel like a game first and a finance lesson second.

## Game Loop

The game progresses in yearly turns.

Each year, the player goes through a decision step in which they can:

1. review their current gold, holdings, and market situation
2. sell existing assets
3. buy new assets
4. react to inflation, market phases, and random events
5. end the year and move to the next step

This step-based structure makes the game easy to explain and suitable for short mobile sessions.

## Resource / Asset Mapping

The simulator uses medieval goods as metaphors for financial asset classes.

### 1. Wood = Safe ETFs / low-risk diversified investments

Wood represents the safest asset class in the game.

Characteristics:

- relatively stable value
- lower volatility
- lower but more predictable returns
- suitable for conservative strategies
- acts as the beginner-friendly safe investment option

Finance analogy:

- broad ETFs
- diversified long-term index investing
- lower emotional stress, steadier growth

### 2. Potatoes = Stocks / medium-risk investments

Potatoes represent a medium-risk asset.

Characteristics:

- generally productive and useful
- can perform well over time
- some uncertainty due to harvest quality or changing conditions
- occasional setbacks, but usually still a reasonable growth asset

Finance analogy:

- stocks and equities
- more upside than safe assets
- moderate risk
- affected by economic cycles and company-like performance variability

### 3. Fish = Bitcoin / high-risk speculative asset

Fish represents the riskiest and most volatile asset.

Characteristics:

- highly unpredictable
- value can change drastically
- fish can spoil quickly
- when fishing, supply may vary a lot
- potentially high reward, but also major downside

Finance analogy:

- Bitcoin and crypto
- high volatility
- speculative appeal
- emotionally exciting, but risky for inexperienced users

## Economic Systems

### Inflation

The game includes inflation, meaning the prices of goods and the player's purchasing power change over time.

Purpose:

- teach that holding only cash or gold is not always ideal
- show that rising prices can erode real wealth
- create pressure to think long term

Inflation can affect:

- asset prices
- cost of the farm
- event outcomes
- overall strategic urgency

### Market Phases

The world alternates between peace and war phases.

These phases are represented through the metaphor of the ruler:

- Peace Time = Prosperity
- War Time = Conflict

This affects the economy and expected asset behavior.

Possible meaning:

- Good King: more prosperity, stronger markets, better returns
- Bad King: fear, declining prices, harder conditions, more negative events

This allows players to intuitively understand market sentiment without needing financial jargon.

## Random Events

The simulator includes event generators that create uncertainty and replayability. In addition to predefined scenarios, 15% of game steps include an AI-generated event created by Gemini based on current game context.

Examples:

- plague and pest
- thief steals part of the wealth
- harvest failure
- storms
- shortages
- lucky trade opportunity
- exceptionally good fishing season
- tax increase by the king
- traveling merchant opens a rare opportunity

Purpose of events:

- make the simulation less deterministic
- introduce external shocks like real markets
- force adaptation
- create memorable moments
- reinforce that investing outcomes are influenced by both planning and uncertainty

## Product Principles

### 1. Soft Introduction to Finance

Avoid overwhelming users with terms like:

- ETF
- equity
- portfolio allocation
- asset class
- crypto volatility

Instead, teach these concepts through gameplay and metaphor first.

### 2. Strategy Over Complexity

The game should be easy to understand, but still allow:

- meaningful tradeoffs
- different strategies
- risk preferences
- replayability

### 3. Competitive Motivation

The leaderboard and multiplayer framing should motivate players to:

- come back
- optimize strategies
- compare results
- discuss choices with others

### 4. Learning by Experience

The player should discover insights naturally, for example:

- "Holding only gold made me lose purchasing power."
- "Fish gave high returns once, but also crashed badly."
- "Wood felt safer during bad king years."
- "Diversifying helped me survive crises."

## Possible Core State Model

A game state may include:

- player id
- current year
- current gold balance
- yearly salary and income
- current holdings of wood, potatoes, and fish
- current prices of all assets
- inflation rate
- current king and market phase
- active or recent event
- farm purchase price
- net worth
- leaderboard position

## Possible Turn Resolution Order

A reasonable yearly simulation order could be:

1. start of year state is shown
2. salary or regular income is added
3. current king or market phase is determined or updated
4. inflation is applied
5. prices for wood, potatoes, and fish are updated
6. a random event may occur
7. player decides what to buy and sell
8. end-of-year wealth is calculated
9. check whether the player can buy the farm
10. update leaderboard and save progression

## What This Project Is Not

To keep the scope focused, this project is not trying to be:

- a realistic professional trading platform
- a tax simulator
- a detailed macroeconomics engine
- a historically accurate medieval economy
- a hardcore strategy game with complex menus

It is a gamified educational finance experience.
