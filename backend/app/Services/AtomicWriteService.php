<?php

namespace App\Services;

use App\Exceptions\ConcurrentWriteException;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Serializes short read/validate/write sections on SQLite, where row-level
 * locks are unavailable. Other database drivers retain Laravel transactions.
 */
class AtomicWriteService
{
    /** @template T
     *  @param Closure(): T $callback
     *  @return T
     */
    public function run(Closure $callback): mixed
    {
        $connection = DB::connection();
        if ($connection->getDriverName() !== 'sqlite' || $connection->transactionLevel() > 0) {
            return DB::transaction($callback, 3);
        }

        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                $connection->unprepared('BEGIN IMMEDIATE');
                try {
                    $result = $callback();
                    $connection->unprepared('COMMIT');

                    return $result;
                } catch (Throwable $exception) {
                    $this->rollBack($connection);
                    throw $exception;
                }
            } catch (Throwable $exception) {
                if (! $this->isContention($exception)) {
                    throw $exception;
                }

                $this->rollBack($connection);
                if ($attempt === 2) {
                    throw new ConcurrentWriteException('The request could not acquire the database write lock.', previous: $exception);
                }
                usleep(25_000 * ($attempt + 1));
            }
        }

        throw new ConcurrentWriteException('The request could not acquire the database write lock.');
    }

    private function rollBack(object $connection): void
    {
        try {
            $connection->unprepared('ROLLBACK');
        } catch (Throwable) {
            // There is no active transaction to roll back.
        }
    }

    private function isContention(Throwable $exception): bool
    {
        if (! $exception instanceof QueryException && ! $exception instanceof \PDOException) {
            return false;
        }

        $message = strtolower($exception->getMessage());

        return str_contains($message, 'database is locked')
            || str_contains($message, 'database is busy')
            || str_contains($message, 'database table is locked');
    }
}
