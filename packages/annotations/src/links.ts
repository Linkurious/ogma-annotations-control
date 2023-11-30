import { Point } from '@linkurious/ogma';
import { nanoid as getId } from 'nanoid';
import { Arrow, Id, TargetType, Link, Side } from './types';

/**
 * Class that implements linking between annotation arrows and different items.
 * An arrow can be connected to a text or to a node. It supports double indexing
 * so that you could get the arrow by the id of the text or the id of the node
 * or by the id of the arrow id itself.
 * A node or text can be connected to multiple arrows.
 * An arrow can be connected to only one node or text, but on both ends.
 */
export class Links {
  private links: Record<Id, Link> = {};
  private linksByTargetId: Record<Id, Id[]> = {};
  private linksByArrowId: Record<Id, { start?: Id; end?: Id }> = {};

  public add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    connectionPoint: Point
  ) {
    const id = getId();
    const arrowId = arrow.id;
    // create a link
    const link: Link = {
      id,
      arrow: arrowId,
      target: targetId,
      targetType,
      connectionPoint,
      side
    };
    // add it to the links
    this.links[id] = link;
    // add it to the linksByTargetId
    if (!this.linksByTargetId[targetId]) {
      this.linksByTargetId[targetId] = [];
    }
    this.linksByTargetId[targetId].push(id);

    // add it to the linksByArrowId
    if (!this.linksByArrowId[arrowId]) {
      this.linksByArrowId[arrowId] = {};
    }
    this.linksByArrowId[arrowId][side] = id;

    // make it serializable
    arrow.properties.link = arrow.properties.link || {};
    arrow.properties.link[side] = {
      id: targetId,
      side,
      type: targetType,
      magnet: connectionPoint
    };
    return this;
  }

  public arrowIsLinked(arrowId: Id, side: Side) {
    return !!this.linksByArrowId[arrowId]?.[side];
  }

  // remove the link between the arrow and the target by arrow id and side
  public remove(arrow: Arrow, side: Side) {
    const arrowId = arrow.id;
    const id = this.linksByArrowId[arrowId]?.[side];
    delete arrow.properties.link?.[side];
    if (!id) return this;
    const link = this.links[id];
    // remove the link from the links
    delete this.links[id];
    // remove the link from the linksByTargetId
    const targetLinks = this.linksByTargetId[link.target];
    for (let i = 0; i < targetLinks.length; i++) {
      if (targetLinks[i] === id) {
        targetLinks.splice(i, 1);
        break;
      }
    }
    // remove the link from the linksByArrowId
    delete this.linksByArrowId[arrowId][side];
    return this;
  }

  getArrowLink(arrowId: Id, side: Side): Link | null {
    const id = this.linksByArrowId[arrowId]?.[side];
    if (!id) return null;
    return this.links[id];
  }

  getTargetLinks(targetId: Id): Link[] {
    return this.linksByTargetId[targetId]?.map((id) => this.links[id]) ?? [];
  }
}
