var move = function(gameDataOld, helpers){
  var gameData = JSON.parse(JSON.stringify(gameDataOld)); // prevent circular reference error in codetester site
  gameDataOld.mapBefore = helpers.asciiBoard(gameData);
  var myHero = gameData.activeHero;
  var board = gameData.board;
  var isUnoccupied = function(tile){return tile.type === 'Unoccupied'};
  var isHealthWell = function(tile){return tile.type === 'HealthWell'};
//  var isGrave = function(tile){return tile.type === 'Unoccupied' && tile.subType === 'Bones'};
  var isDiamondEnemy = function(tile){
    return tile.type === 'DiamondMine' && ( !(tile.owner) || tile.owner.dead || tile.owner.team!==myHero.team );
  };
  var isDiamondAnyone = function(tile){
    return tile.type === 'DiamondMine' && (!tile.owner || tile.owner.id !== myHero.id);
  };
  var isEnemyBelow = function(hp){return function(tile){
    return tile.type === 'Hero' && tile.team !== myHero.team && tile.health <= hp;
  };};
  var isEnemyAbove = function(hp){return function(tile){
    return tile.type === 'Hero' && tile.team !== myHero.team && tile.health >= hp;
  };};
  var isAllyBelow = function(hp){return function(tile){
    return tile.type === 'Hero' && tile.team === myHero.team && tile.id !== myHero.id && tile.health <= hp;
  };};
  var weakToStrong = function(t1,t2){return t1.health > t2.health};
  var getDirection = function(tile,msg){
    if(window && window.console){
      console.log(helpers.asciiBoard(gameData));
      console.log(msg+'    myh:'+ (tile==myHero)+'    dir:'+(tile.direction)+'   dW:'+(tile.distanceToWell)+'   dM:'+(tile.distanceToMine));

      for(var i=0; i < possibleMoves.length; ++i){
        var pM=possibleMoves[i];
        console.log('pos:'+pM.distanceFromTop+'|'+pM.distanceFromLeft+'   unsafe:'+pM.unsafe+'   mine:'+pM.distanceToMine+'   well:'+pM.distanceToWell+'   dir:'+pM.direction+'   copyH:'+pM.copyHealth);
      };
    };
    return tile.direction;
  };
  var unsafeMoves=[],safeMoves=[];
  var temp;

  myHero.ringOne = helpers.adjacentTiles(gameData, myHero, true);
  myHero.ringTwo = helpers.ringTwoTiles(gameData, myHero);
  var possibleMoves = myHero.ringOne.filter(isUnoccupied).concat(myHero);
  for ( var i=0; i < possibleMoves.length; ++i){
/*    temp = helpers.makeListOfObjectDirectionAndDistance(board, possibleMoves[i], isHealthWell);
    possibleMoves[i].distanceToWell = (temp.length ? temp[0].distance : 8 * board.lengthOfSide);
    temp = helpers.makeListOfObjectDirectionAndDistance(board, possibleMoves[i], isDiamondEnemy);
    if (temp.length == 0){
      temp = helpers.makeListOfObjectDirectionAndDistance(board, possibleMoves[i], isDiamondAnyone);
    };
    possibleMoves[i].distanceToMine = (temp.length ? temp[0].distance : 8 * board.lengthOfSide);
*/
    temp = helpers.findNearestObjectDirectionAndDistance(board, possibleMoves[i], isHealthWell);
    possibleMoves[i].distanceToWell = temp ? temp.distance : 8*board.lengthOfSide;
    temp = helpers.findNearestObjectDirectionAndDistance(board, possibleMoves[i], isDiamondEnemy) ||
      helpers.findNearestObjectDirectionAndDistance(board, possibleMoves[i], isDiamondAnyone);
    possibleMoves[i].distanceToMine = temp ? temp.distance : 8*board.lengthOfSide;
  };
  var nearbyTiles = myHero.ringTwo.concat(myHero.ringOne, myHero);
  for ( var i=0; i < nearbyTiles.length; ++i){
    temp = nearbyTiles[i];
    temp.ringOne = helpers.adjacentTiles(gameData, temp, myHero==temp);
    temp.ringTwo = helpers.ringTwoTiles (gameData, temp);
    temp.alliesNearby = temp.ringOne.filter(isAllyBelow(100)).sort(weakToStrong);
    temp.potionNearby = temp.ringOne.filter(isHealthWell);
    temp.enemiesBelow20 = temp.ringOne.filter(isEnemyBelow(20));
    temp.enemiesAbove20 = temp.ringOne.filter(isEnemyAbove(20)).sort(weakToStrong);
    temp.twoAwayEnemies = temp.ringTwo.filter(isEnemyAbove(0));
    temp.attackedEnemies = temp.twoAwayEnemies.concat(temp.enemiesAbove20);
    if(temp.enemiesAbove20.length && temp.enemiesAbove20[0].health==40){
      temp.enemiesAbove20.push(temp.enemiesAbove20.shift());
    };
  };

  //onehitko



  // for all blocks,
  //   list all nearby enemies above 30 health.
  //   if none of them is near an enemy or HealthWell
  for(var i=0; i < possibleMoves.length; ++i){
    var pM = possibleMoves[i];
    for (var j=0; j < gameData.heroes.length; ++j){
      gameData.heroes[j].copyHealth = gameData.heroes[j].health;
      
    };
    for (var j=0; j < pM.enemiesAbove20.length; ++j){
      temp = pM.enemiesAbove20[j];
      if ( temp.potionNearby.length || temp.enemiesAbove20.length || temp.enemiesBelow20.length )
        break;
    };
    if(j!=pM.enemiesAbove20.length && pM.potionNearby.length==0) {//not alone
      pM.unsafe = true;
      unsafeMoves.push(pM);
    continue;
    };
    pM.copyHealth = myHero.health + 10 * pM.twoAwayEnemies.length; // 20 dmg from twoAwayEnemies 1st turn
    for (var j=0; j < pM.enemiesAbove20.length; ++j){
      pM.enemiesAbove20[j].copyHealth -= (j==0&&myHero==pM ? 30 : 20);
    };
    while (pM.copyHealth > 0 && pM.attackedEnemies.length > 0){
      for(var j= pM.attackedEnemies.length - 1 ;  j < 0  ; --j){
        if (pM.attackedEnemies[j].copyHealth <= 0) pM.attackedEnemies.splice(j,1);
      };
      pM.copyHealth -= 30 * pM.attackedEnemies.length;
      for (var j=0; j < pM.enemiesAbove20.length; ++j){
        pM.enemiesAbove20[j].copyHealth -= 20;
      };
      pM.attackedEnemies.sort(weakToStrong);
      if (pM.attackedEnemies[0].copyHealth==20) pM.attackedEnemies.push(pM.attackedEnemies.shift());
      pM.attackedEnemies[0].copyHealth -= 10;
    };
    if (pM.copyHealth <= 0){
      pM.unsafe = true;
      unsafeMoves.push(pM);
    continue;
    } else if (pM.attackedEnemies.length == 0){
      pM.unsafe = false;
      safeMoves.push(pM);
    };
  };

  if (safeMoves.length == 0){
    //return console.log('no safeMoves'),helpers.findNearestHealthWell(myHero)||helpers.findNearestEnemy(myHero);
    for (var i=0; i < unsafeMoves.length; ++i){
      if(unsafeMoves[i].potionNearby.length!=0)
        return getDirection(unsafeMoves[i],'unsafeMoves health');
    };
    return getDirection(possibleMoves.sort(function(t1,t2){return t1.distanceToWell > t2.distanceToWell;})[0],'NOT safeMoves');
  };

  // ATACAAARRRR
  safeMoves.sort(function(t1,t2){return t1.copyHealth > t2.copyHealth;});
  for (var i=0; i < possibleMoves.length; ++i){
    if (possibleMoves[i].enemiesBelow20.length)
      return getDirection(possibleMoves[i],'FINISH HIM !!');
  };
  if (myHero.enemiesAbove20.length && safeMoves[i].enemiesAbove20[0].health==30){
    myHero.direction = myHero.enemiesAbove20[0].direction;
    return getDirection(myHero,'FINISH HIM !!');
  };
  for (var i=0; i < safeMoves.length; ++i){
    if(safeMoves[i].enemiesAbove20.length==1 && safeMoves[i].twoAwayEnemies.length==0
      && safeMoves[i].enemiesAbove20[0].potionNearby.length==0
      && safeMoves[i].enemiesAbove20[0].enemiesAbove20.length==0)      
        return getDirection(possibleMoves[i],'pursuit lone enemy');
  };
  if (safeMoves[0].copyHealth < myHero.health)
    return getDirection(safeMoves[0],'ATACAAAAARR ! ! ! ');

  // mine if safe
  if (nearbyTiles.filter(isEnemyAbove(20)).length==0){
    temp = myHero.ringOne.filter(isDiamondAnyone);
    if (temp.length && myHero.health > 80)
      return getDirection(temp[0],'take mine');
  };
  //nearby move write
  if (myHero.alliesNearby.length)
    myHero.direction = myHero.alliesNearby[0].direction;
  if (myHero.alliesNearby.filter(isAllyBelow(80)).length==0 && myHero.potionNearby.length && myHero.health < 100){
    myHero.direction = myHero.potionNearby[0].direction;
  }else if (myHero.enemiesAbove20.length){
    myHero.direction = myHero.enemiesAbove20[0].direction;
  };
  if (myHero.potionNearby.length && myHero.health <= 80)
    return getDirection(myHero.potionNearby[0],'potionNearby');

  /*
  if (myHero.health <= 40) return getDirection(safeMoves.sort(function(t1,t2){return t1.distanceToWell > t2.distanceToWell;})[0],'health');
  if (myHero.health > 40) return getDirection(safeMoves.sort(function(t1,t2){return t1.distanceToMine > t2.distanceToMine;})[0],'seek mine');
  */
  safeMoves.sort(function(t1,t2){return t1.distanceToWell > t2.distanceToWell;});
  if (myHero.health > 80) safeMoves.sort(function(t1,t2){return t1.distanceToMine > t2.distanceToMine;});
  if (safeMoves.length > 1 && safeMoves[0]==myHero){
    temp = 1 + (safeMoves.length-1)*Math.floor(Math.random());
    return getDirection(safeMoves[temp],'random safeMoves');
  }else{
    return getDirection(safeMoves[0],'safeMoves health or mine');
  };
};

module.exports = move;
