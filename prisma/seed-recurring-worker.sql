INSERT INTO "Worker" ("id","name","description","enabled","primaryProvider","secondaryProvider","intervalSeconds","createdAt","updatedAt")
VALUES ('recurring_txn','Lancamentos recorrentes','Cria automaticamente os lancamentos a partir das recorrencias vencidas de cada usuario.',true,'database',NULL,3600,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
