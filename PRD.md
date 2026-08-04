# Product Requirements Document (PRD)

# SaaS Gym Management System

## Project Overview

The SaaS Gym Management System is a multi-tenant platform designed for gym owners to manage members, staff, attendance, leads, fitness tracking, communication, and reporting from a centralized dashboard.

The system will support multiple gyms under a single Super Admin panel while allowing each gym owner to independently manage their operations. Strict data isolation rules are enforced so that Gym Owners and their staff can only view and interact with data (members, leads, notifications, alerts) belonging to their own gym tenant.

---

# Business Objectives

* Digitize gym operations
* Improve member engagement
* Automate attendance and health tracking
* Streamline lead management and conversions
* Enable WhatsApp-based communication
* Provide scalable SaaS architecture
* Support multiple gym branches

---

# User Roles

## Super Admin

* Manage all gyms
* Manage subscriptions
* Manage users
* Manage leads
* View system analytics
* Configure platform settings

## Gym Owner

* Manage gym operations
* Manage staff
* Manage members
* Access reports
* Configure gym settings

## Admin

* Manage daily gym activities
* Manage memberships
* Track attendance

## Trainer

* Manage assigned members
* Update food charts
* Monitor BMI and health progress

## Sales Staff

* Manage leads
* Track conversions
* Follow up with prospects

## Customer

* View profile
* Track attendance
* View food chart
* Monitor BMI progress
* Receive notifications

---

# Core Modules

## Authentication

* Email registration
* Email login
* Password reset
* Email verification
* JWT Authentication
* Onboarding password assignment (Super Admin defines temporary password for Gym Owners on plan request approval)
* Self-service password reset (Gym Owners change their password directly in dashboard Settings panel)
* Automated free trial onboarding (Gym Owners register for a 7-day free trial on the Landing Page, select their own password, and are auto-activated instantly)
* Trial countdown warning banner (Prompts Admins with their remaining free trial days at the top of the dashboard layout)
* Fixed 18% GST billing default (Ensures all newly activated gym accounts default to an 18% GST tax rate)

## Member Management

* Add members
* Membership plans
* Membership renewal
* Profile management

## Attendance Management

* Check-in system
* Device verification
* Location verification
* Attendance history

## BMI Management

* Height and weight tracking
* Automatic BMI calculation
* BMI category classification

## Health Monitoring

* 15-day health tracking
* Progress reports
* Automated reminders

## CRM & Leads

* Lead capture
* Lead assignment
* Lead follow-up
* Conversion tracking

## Food Chart Management

* Personalized food plans
* Update reminders
* History tracking

## WhatsApp Integration

### Basic Plan

* Reports only

### Standard Plan

* Manual WhatsApp messaging

### Premium Plan

* Auto reminders
* Payment notifications
* Marketing campaigns

## Landing Page CMS

* Banner management
* Content management
* Plan management
* Dynamic updates

## Backup System

* Automated email backups
* Recovery support
* Data export

---

# Mobile Applications

* Android WebView App
* iOS WebView App

---

# Hosting

Recommended Platform:

* Railway.app

Future Scaling:

* AWS
* Google Cloud Platform

---

# Success Metrics

* Member retention
* Lead conversion rate
* Attendance consistency
* Subscription renewals
* Trainer performance
