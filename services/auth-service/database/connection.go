package database

import (
	"authentication-service/utils"
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var Database *mongo.Database

func Connect() error {
	logger := utils.GetLogger()

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/lexaauth"
	}

	// Configure connection pool for production workloads
	clientOptions := options.Client().ApplyURI(mongoURI)
	clientOptions.SetMaxPoolSize(100)                         // Increased from 10 to handle more concurrent requests
	clientOptions.SetMinPoolSize(10)                          // Increased from 5 to keep warm connections
	clientOptions.SetMaxConnIdleTime(5 * time.Minute)         // Keep connections alive longer
	clientOptions.SetConnectTimeout(10 * time.Second)         // Timeout for initial connection
	clientOptions.SetServerSelectionTimeout(10 * time.Second) // Timeout for selecting server
	clientOptions.SetSocketTimeout(30 * time.Second)          // Timeout for socket operations

	var err error
	Client, err = mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = Client.Ping(ctx, nil)
	if err != nil {
		return err
	}

	Database = Client.Database("lexaauth")

	logger.Info().
		Int("max_pool", 100).
		Int("min_pool", 10).
		Msg("Connected to MongoDB")
	return nil
}

func Disconnect() error {
	if Client == nil {
		return nil
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	return Client.Disconnect(ctx)
}

func GetCollection(name string) *mongo.Collection {
	return Database.Collection(name)
}