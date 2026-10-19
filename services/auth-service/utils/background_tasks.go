package utils

import (
	"context"

	"golang.org/x/sync/semaphore"
)

// BackgroundTaskExecutor manages bounded concurrent background tasks
type BackgroundTaskExecutor struct {
	sem *semaphore.Weighted
}

// NewBackgroundTaskExecutor creates a new executor with a maximum concurrency limit
func NewBackgroundTaskExecutor(maxConcurrent int64) *BackgroundTaskExecutor {
	return &BackgroundTaskExecutor{
		sem: semaphore.NewWeighted(maxConcurrent),
	}
}

// Execute runs a task in the background with semaphore-controlled concurrency
// Returns immediately without blocking, but respects the concurrency limit
func (e *BackgroundTaskExecutor) Execute(ctx context.Context, task func()) {
	logger := GetLogger()

	// Try to acquire semaphore without blocking
	if !e.sem.TryAcquire(1) {
		// If we can't acquire, skip this background task
		// This prevents queueing up too many tasks
		logger.Warn().Msg("Background task skipped: concurrency limit reached")
		return
	}

	go func() {
		defer e.sem.Release(1)

		// Recover from any panics in background tasks
		defer func() {
			if r := recover(); r != nil {
				logger.Error().
					Interface("panic", r).
					Msg("Background task panicked")
			}
		}()

		task()
	}()
}

// ExecuteBlocking runs a task in the background, waiting if necessary to acquire semaphore
// This variant will block until a slot is available
func (e *BackgroundTaskExecutor) ExecuteBlocking(ctx context.Context, task func()) error {
	if err := e.sem.Acquire(ctx, 1); err != nil {
		return err
	}

	go func() {
		defer e.sem.Release(1)
		task()
	}()

	return nil
}

// Global background task executor (max 100 concurrent background tasks)
var globalExecutor = NewBackgroundTaskExecutor(100)

// ExecuteBackgroundTask executes a task in the background with concurrency control
func ExecuteBackgroundTask(ctx context.Context, task func()) {
	globalExecutor.Execute(ctx, task)
}
